import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getUserById } from '../data/users';
import type { TrackingEvent, TrackingEventType } from '../context/TrackingContext';
import { API_BASE } from '../lib/api';

// Away periods (focus_lost → focus_gained) are compressed to this many ms of virtual time
const AWAY_DISPLAY_MS = 8000;

const EVENT_COLORS: Record<TrackingEventType, string> = {
  edit: '#4caf50',
  paste: '#f44336',
  copy: '#ff9800',
  focus_lost: '#ff5722',
  focus_gained: '#2196f3',
  run: '#9c27b0',
  submit: '#00bcd4',
};

const EVENT_LABELS: Record<TrackingEventType, string> = {
  edit: 'Typing',
  paste: 'Paste',
  copy: 'Copy',
  focus_lost: 'Left Page',
  focus_gained: 'Returned',
  run: 'Run Code',
  submit: 'Submitted',
};

const SPEEDS = [1, 2, 5, 10, 30] as const;

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function getCodeAtTime(events: TrackingEvent[], timestamp: number, starterCode: string): string {
  const snapshotEvents = events.filter((e) => e.codeSnapshot && e.timestamp <= timestamp);
  if (snapshotEvents.length === 0) return starterCode;
  return snapshotEvents[snapshotEvents.length - 1].codeSnapshot!;
}

function getEventsNearTime(events: TrackingEvent[], timestamp: number, windowMs = 500): TrackingEvent[] {
  return events.filter((e) => Math.abs(e.timestamp - timestamp) <= windowMs);
}

// ── Compressed timeline ────────────────────────────────────────────────────

interface Segment {
  realStart: number;
  realEnd: number;
  virtualStart: number;
  isAway: boolean;
}

function buildSegments(events: TrackingEvent[], startTime: number, endTime: number): {
  segments: Segment[];
  virtualDuration: number;
} {
  if (startTime >= endTime) return { segments: [], virtualDuration: 0 };

  const awayIntervals: { start: number; end: number }[] = [];
  let awayStart: number | null = null;
  for (const e of events) {
    if (e.type === 'focus_lost' && awayStart === null) awayStart = e.timestamp;
    else if (e.type === 'focus_gained' && awayStart !== null) {
      awayIntervals.push({ start: awayStart, end: e.timestamp });
      awayStart = null;
    }
  }

  const segments: Segment[] = [];
  let realCursor = startTime;
  let virtualCursor = 0;

  for (const away of awayIntervals) {
    if (away.start <= realCursor) continue;
    segments.push({ realStart: realCursor, realEnd: away.start, virtualStart: virtualCursor, isAway: false });
    virtualCursor += away.start - realCursor;
    segments.push({ realStart: away.start, realEnd: away.end, virtualStart: virtualCursor, isAway: true });
    virtualCursor += AWAY_DISPLAY_MS;
    realCursor = away.end;
  }

  if (realCursor < endTime) {
    segments.push({ realStart: realCursor, realEnd: endTime, virtualStart: virtualCursor, isAway: false });
    virtualCursor += endTime - realCursor;
  }

  return { segments, virtualDuration: virtualCursor };
}

function realToVirtualPct(ts: number, segments: Segment[], virtualDuration: number): number {
  if (virtualDuration === 0) return 0;
  for (const seg of segments) {
    if (ts <= seg.realEnd) {
      if (seg.isAway) return (seg.virtualStart + AWAY_DISPLAY_MS / 2) / virtualDuration;
      return (seg.virtualStart + (ts - seg.realStart)) / virtualDuration;
    }
  }
  return 1;
}

function virtualPctToReal(pct: number, segments: Segment[], virtualDuration: number): number {
  if (virtualDuration === 0 || segments.length === 0) return 0;
  const vms = pct * virtualDuration;
  for (const seg of segments) {
    const segVirtualEnd = seg.isAway
      ? seg.virtualStart + AWAY_DISPLAY_MS
      : seg.virtualStart + (seg.realEnd - seg.realStart);
    if (vms <= segVirtualEnd) {
      if (seg.isAway) {
        const awayPct = (vms - seg.virtualStart) / AWAY_DISPLAY_MS;
        return seg.realStart + awayPct * (seg.realEnd - seg.realStart);
      }
      return seg.realStart + (vms - seg.virtualStart);
    }
  }
  return segments[segments.length - 1].realEnd;
}

// ── Misconduct / risk analysis ─────────────────────────────────────────────

interface RiskFinding {
  label: string;
  detail: string;
  severity: 'warning' | 'critical';
}

interface RiskResult {
  level: 'low' | 'medium' | 'high';
  score: number; // 0–100
  findings: RiskFinding[];
}

function computeRisk(events: TrackingEvent[], starterCode: string): RiskResult {
  const findings: RiskFinding[] = [];
  let score = 0;

  const pastes = events.filter((e) => e.type === 'paste');
  const focusLosses = events.filter((e) => e.type === 'focus_lost');
  const snapshots = events.filter((e) => e.codeSnapshot);

  const finalCode = snapshots.length > 0 ? snapshots[snapshots.length - 1].codeSnapshot! : starterCode;
  const starterChars = starterCode.replace(/\s/g, '').length;
  const finalChars = finalCode.replace(/\s/g, '').length;
  const addedChars = Math.max(1, finalChars - starterChars);

  const totalPastedChars = pastes.reduce((s, e) => s + (e.detail?.replace(/\s/g, '').length ?? 0), 0);
  const totalPastedLines = pastes.reduce((s, e) => s + (e.detail?.split('\n').length ?? 1), 0);
  const pasteRatio = Math.min(1, totalPastedChars / addedChars);

  const durationMin = events.length > 1
    ? (events[events.length - 1].timestamp - events[0].timestamp) / 60000
    : 0;

  // ── Paste events ──
  if (pastes.length > 0) {
    score += pastes.length >= 3 ? 25 : pastes.length === 2 ? 15 : 8;
    findings.push({
      label: `${pastes.length} paste event${pastes.length !== 1 ? 's' : ''} · ${totalPastedLines} lines`,
      detail: 'Code was pasted directly into the editor',
      severity: pastes.length >= 3 ? 'critical' : 'warning',
    });
  }

  // ── Paste ratio ──
  if (pasteRatio > 0.35) {
    score += pasteRatio > 0.6 ? 30 : 15;
    findings.push({
      label: `${Math.round(pasteRatio * 100)}% of solution came from paste`,
      detail: 'Majority of written code was not typed by the student',
      severity: pasteRatio > 0.6 ? 'critical' : 'warning',
    });
  }

  // ── Large single pastes ──
  const largePastes = pastes.filter((e) => (e.detail?.split('\n').length ?? 0) > 5);
  if (largePastes.length > 0) {
    const maxLines = Math.max(...largePastes.map((e) => e.detail?.split('\n').length ?? 0));
    score += 20;
    findings.push({
      label: `${largePastes.length} large paste${largePastes.length !== 1 ? 's' : ''} — up to ${maxLines} lines`,
      detail: 'Multi-line blocks suggest copying a complete or near-complete solution',
      severity: 'critical',
    });
  }

  // ── Tab switching ──
  if (focusLosses.length >= 1) {
    score += focusLosses.length >= 4 ? 20 : focusLosses.length >= 2 ? 10 : 5;
    findings.push({
      label: `Left page ${focusLosses.length} time${focusLosses.length !== 1 ? 's' : ''}`,
      detail: 'Student switched away from the assignment window',
      severity: focusLosses.length >= 4 ? 'critical' : 'warning',
    });
  }

  // ── Suspiciously fast completion ──
  if (durationMin > 0 && durationMin < 4 && addedChars > 100) {
    score += 15;
    const label = durationMin < 1
      ? `Completed in ${Math.round(durationMin * 60)}s`
      : `Completed in ${durationMin.toFixed(1)}m`;
    findings.push({
      label,
      detail: 'Solution appeared unusually quickly relative to its length',
      severity: 'warning',
    });
  }

  // ── Ghost typing: code grew faster than human typing speed between edit snapshots ──
  const editSnaps = snapshots.filter((e) => e.type === 'edit');
  let maxGhostChars = 0;
  for (let i = 1; i < editSnaps.length; i++) {
    const timeSec = (editSnaps[i].timestamp - editSnaps[i - 1].timestamp) / 1000;
    const charDelta = editSnaps[i].codeSnapshot!.length - editSnaps[i - 1].codeSnapshot!.length;
    // 10 chars/sec ≈ 120 WPM — implausibly fast sustained typing
    if (charDelta > 0 && timeSec > 0 && timeSec < charDelta / 10) {
      maxGhostChars = Math.max(maxGhostChars, charDelta);
    }
  }
  if (maxGhostChars > 80) {
    score += 15;
    findings.push({
      label: `${maxGhostChars} chars appeared faster than possible typing`,
      detail: 'Code may have been composed outside the editor and inserted without a paste event',
      severity: maxGhostChars > 200 ? 'critical' : 'warning',
    });
  }

  const level: RiskResult['level'] = score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low';
  return { level, score: Math.min(100, score), findings };
}

// ── Risk panel ─────────────────────────────────────────────────────────────

function RiskPanel({ result }: { result: RiskResult }) {
  const COLOR = { low: '#4caf50', medium: '#ff9800', high: '#f44336' };
  const BG    = { low: 'rgba(76,175,80,0.08)',  medium: 'rgba(255,152,0,0.08)',  high: 'rgba(244,67,54,0.08)' };
  const BORDER = { low: 'rgba(76,175,80,0.25)', medium: 'rgba(255,152,0,0.25)', high: 'rgba(244,67,54,0.25)' };
  const LABEL  = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };

  const color = COLOR[result.level];

  return (
    <div style={{
      background: BG[result.level],
      border: `1px solid ${BORDER[result.level]}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 24,
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
    }}>
      {/* Score circle */}
      <div style={{ flexShrink: 0, textAlign: 'center', width: 72 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          border: `3px solid ${color}`,
          background: `${color}18`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 6px',
        }}>
          <span style={{ fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>{result.score}</span>
          <span style={{ fontSize: 9, color, opacity: 0.7 }}>/100</span>
        </div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {LABEL[result.level]}
        </p>
      </div>

      {/* Findings */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#ccc' }}>
          Misconduct Analysis
        </p>
        {result.findings.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: '#666' }}>No suspicious activity detected.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {result.findings.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{
                  fontSize: 8, flexShrink: 0, marginTop: 1,
                  color: f.severity === 'critical' ? '#f44336' : '#ff9800',
                }}>●</span>
                <span style={{ fontSize: 13, color: '#ddd', fontWeight: 500 }}>{f.label}</span>
                <span style={{ fontSize: 12, color: '#555' }}>— {f.detail}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Code growth chart ──────────────────────────────────────────────────────

function CodeGrowthChart({
  events,
  starterCode,
  segments,
  virtualDuration,
  scrubPercent,
}: {
  events: TrackingEvent[];
  starterCode: string;
  segments: Segment[];
  virtualDuration: number;
  scrubPercent: number;
}) {
  const W = 1000;
  const H = 90;

  const snapshots = events.filter((e) => e.codeSnapshot);
  if (snapshots.length === 0) return null;

  type Point = { pct: number; lines: number; isPaste: boolean };

  const pts: Point[] = [{ pct: 0, lines: starterCode.split('\n').length, isPaste: false }];

  for (const e of snapshots) {
    const pct = virtualDuration > 0
      ? realToVirtualPct(e.timestamp, segments, virtualDuration)
      : 0;
    pts.push({ pct, lines: e.codeSnapshot!.split('\n').length, isPaste: e.type === 'paste' });
  }

  const maxLines = Math.max(...pts.map((p) => p.lines), 2);
  const toX = (pct: number) => (pct * W).toFixed(1);
  const toY = (lines: number) => (H - (lines / maxLines) * H * 0.88).toFixed(1);

  const polyPoints = pts.map((p) => `${toX(p.pct)},${toY(p.lines)}`).join(' ');
  const areaPath = [
    `M ${toX(pts[0].pct)},${H}`,
    `L ${toX(pts[0].pct)},${toY(pts[0].lines)}`,
    ...pts.slice(1).map((p) => `L ${toX(p.pct)},${toY(p.lines)}`),
    `L ${toX(pts[pts.length - 1].pct)},${H} Z`,
  ].join(' ');

  const pastePts = pts.filter((p) => p.isPaste);

  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, color: '#555' }}>
        Code growth · <span style={{ color: '#f4433688' }}>red dashes = paste events</span>
      </p>
      <div style={{ position: 'relative', background: '#0d0d0d', borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', width: '100%', height: 90 }} preserveAspectRatio="none">
          <path d={areaPath} fill="rgba(105,62,214,0.18)" />
          <polyline points={polyPoints} fill="none" stroke="#693ed6" strokeWidth="1.5" strokeLinejoin="round" />
          {pastePts.map((p, i) => (
            <line key={i} x1={toX(p.pct)} y1={0} x2={toX(p.pct)} y2={H}
              stroke="#f44336" strokeWidth="1.5" strokeDasharray="4,3" opacity={0.65} />
          ))}
          {scrubPercent > 0 && (
            <line x1={toX(scrubPercent)} y1={0} x2={toX(scrubPercent)} y2={H}
              stroke="white" strokeWidth="1" opacity={0.35} />
          )}
        </svg>
        <span style={{ position: 'absolute', top: 4, left: 6, fontSize: 10, color: '#333' }}>{maxLines} ln</span>
        <span style={{ position: 'absolute', bottom: 4, left: 6, fontSize: 10, color: '#333' }}>0</span>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function Timeline() {
  const navigate = useNavigate();
  const { classId, assignmentId, userId } = useParams<{
    classId: string;
    assignmentId: string;
    userId: string;
  }>();
  const student = getUserById(userId ?? '');

  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [initialScore, setInitialScore] = useState<number | null>(null);
  const [initialComments, setInitialComments] = useState('');
  const [assignmentPoints, setAssignmentPoints] = useState<number>(10);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [starterCode, setStarterCode] = useState('');

  const [tab, setTab] = useState<'timeline' | 'submission'>('timeline');
  const [grade, setGrade] = useState<string>('');
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const timelineBarRef = useRef<HTMLDivElement>(null);
  const [scrubPercent, setScrubPercent] = useState(0);
  const isDraggingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(5);
  const playingRef = useRef(playing);
  useEffect(() => { playingRef.current = playing; }, [playing]);

  useEffect(() => {
    if (!userId || !assignmentId) return;
    fetch(`${API_BASE}/api/submissions/${userId}/${assignmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.events) setEvents(data.events);
        setInitialScore(data.score ?? null);
        setInitialComments(data.comments ?? '');
        setGrade(data.score !== null && data.score !== undefined ? String(data.score) : '');
        setComments(data.comments ?? '');
      })
      .catch(() => {});
  }, [userId, assignmentId]);

  useEffect(() => {
    if (!assignmentId) return;
    fetch(`${API_BASE}/api/assignments/${assignmentId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setAssignmentPoints(data.points ?? 10);
        setAssignmentTitle(data.title ?? assignmentId ?? '');
        setStarterCode(data.starterCode ?? '');
      })
      .catch(() => {});
  }, [assignmentId]);

  const startTime = events.length > 0 ? events[0].timestamp : 0;
  const endTime   = events.length > 0 ? events[events.length - 1].timestamp : 0;

  const { segments, virtualDuration } = useMemo(
    () => buildSegments(events, startTime, endTime),
    [events, startTime, endTime],
  );

  const scrubTimestamp = virtualPctToReal(scrubPercent, segments, virtualDuration);
  const codeAtScrub    = getCodeAtTime(events, scrubTimestamp, starterCode);
  const eventsAtScrub  = getEventsNearTime(events, scrubTimestamp, Math.max(500, (endTime - startTime) * 0.02));
  const finalCode      = useMemo(() => {
    const snaps = events.filter((e) => e.codeSnapshot);
    return snaps.length > 0 ? snaps[snaps.length - 1].codeSnapshot! : starterCode;
  }, [events, starterCode]);

  const risk = useMemo(() => computeRisk(events, starterCode), [events, starterCode]);

  const pasteCount    = events.filter((e) => e.type === 'paste').length;
  const focusLostCount = events.filter((e) => e.type === 'focus_lost').length;

  function percentFromMouse(clientX: number): number {
    const bar = timelineBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function handleBarMouseDown(e: React.MouseEvent) {
    setPlaying(false);
    isDraggingRef.current = true;
    setScrubPercent(percentFromMouse(e.clientX));
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) { if (isDraggingRef.current) setScrubPercent(percentFromMouse(e.clientX)); }
    function onMouseUp() { isDraggingRef.current = false; }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
  }, []);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setScrubPercent((p) => {
        const next = p + (speed * 100) / virtualDuration;
        if (next >= 1) { setPlaying(false); return 1; }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playing, speed, virtualDuration]);

  const handleSave = useCallback(async () => {
    if (!userId || !assignmentId) return;
    setSaving(true);
    setSaveStatus('idle');
    const res = await fetch(`${API_BASE}/api/submissions/${userId}/${assignmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: grade !== '' ? Number(grade) : null, comments: comments || null }),
    }).catch(() => null);
    setSaving(false);
    setSaveStatus(res?.ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2500);
  }, [userId, assignmentId, grade, comments]);

  if (events.length === 0) {
    return (
      <div>
        <BackButton onClick={() => navigate(`/class/${classId ?? 'cs101'}`)} />
        <p style={{ fontSize: 18, fontWeight: 600, color: '#e0e0e0', margin: '0 0 8px' }}>Student Timeline</p>
        <p style={{ color: '#888' }}>
          No session data yet for <strong>{student.name}</strong>. Have them complete the assignment first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <BackButton onClick={() => navigate(`/class/${classId ?? 'cs101'}`)} />

      {/* Student header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: student.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {student.initials}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e0e0e0' }}>{student.name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666' }}>
            {assignmentTitle} · {classId?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #2a2a2a' }}>
        {(['timeline', 'submission'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: 'none', border: 'none',
            borderBottom: `2px solid ${tab === t ? '#693ed6' : 'transparent'}`,
            color: tab === t ? '#a87df0' : '#666',
            cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 600 : 400,
            padding: '8px 16px', marginBottom: -1, textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* ── TIMELINE TAB ── */}
      {tab === 'timeline' && (
        <div>
          {/* Summary chips */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
            <Chip label="Duration"  value={formatTime(endTime - startTime)} />
            <Chip label="Edits"     value={String(events.filter((e) => e.type === 'edit').length)} />
            <Chip label="Pastes"    value={String(pasteCount)}    highlight={pasteCount > 0}     color="#f44336" />
            <Chip label="Left page" value={String(focusLostCount)} highlight={focusLostCount > 0} color="#ff5722" />
            <Chip label="Runs"      value={String(events.filter((e) => e.type === 'run').length)} />
            <Chip
              label="Risk score"
              value={`${risk.score}/100`}
              highlight={risk.level !== 'low'}
              color={risk.level === 'high' ? '#f44336' : '#ff9800'}
            />
          </div>

          {/* Misconduct analysis */}
          <RiskPanel result={risk} />

          {/* Playback controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <button
              onClick={() => { if (scrubPercent >= 1) setScrubPercent(0); setPlaying((p) => !p); }}
              style={{
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid #693ed6',
                background: playing ? 'rgba(105,62,214,0.2)' : 'transparent',
                color: '#a87df0', cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {playing ? '⏸' : '▶'}
            </button>
            <div style={{ display: 'flex', gap: 4 }}>
              {SPEEDS.map((s) => (
                <button key={s} onClick={() => setSpeed(s)} style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 12,
                  border: `1px solid ${speed === s ? '#693ed6' : '#2a2a2a'}`,
                  background: speed === s ? 'rgba(105,62,214,0.15)' : 'transparent',
                  color: speed === s ? '#a87df0' : '#555', cursor: 'pointer',
                }}>
                  {s}×
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>
              {formatTimestamp(scrubTimestamp)}
              {endTime > startTime && ` · +${formatTime(scrubTimestamp - startTime)}`}
            </span>
          </div>

          {/* Timeline bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#666' }}>{formatTimestamp(startTime)}</span>
              <span style={{ fontSize: 12, color: '#666' }}>{formatTimestamp(endTime)}</span>
            </div>

            <div
              ref={timelineBarRef}
              onMouseDown={handleBarMouseDown}
              style={{
                position: 'relative', height: 48,
                background: '#1a1a1a', borderRadius: 10,
                cursor: 'ew-resize', userSelect: 'none',
                border: '1px solid #2a2a2a', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: '50%', left: 12, right: 12, height: 2, background: '#2e2e2e', transform: 'translateY(-50%)', borderRadius: 1 }} />
              <div style={{ position: 'absolute', top: '50%', left: 12, width: `calc(${scrubPercent * 100}% - 12px)`, height: 2, background: '#693ed6', transform: 'translateY(-50%)', borderRadius: 1, pointerEvents: 'none' }} />

              {segments.filter((s) => s.isAway).map((seg, i) => {
                const leftPct  = seg.virtualStart / virtualDuration;
                const widthPct = AWAY_DISPLAY_MS / virtualDuration;
                return (
                  <div key={i} title="Student left the page" style={{
                    position: 'absolute', top: 0, bottom: 0,
                    left: `calc(12px + (100% - 24px) * ${leftPct})`,
                    width: `calc((100% - 24px) * ${widthPct})`,
                    background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,87,34,0.12) 3px, rgba(255,87,34,0.12) 6px)',
                    borderLeft: '1px solid rgba(255,87,34,0.3)', borderRight: '1px solid rgba(255,87,34,0.3)',
                    pointerEvents: 'none', zIndex: 1,
                  }} />
                );
              })}

              {events.map((event, i) => {
                const x = realToVirtualPct(event.timestamp, segments, virtualDuration);
                const isSuspicious = event.type === 'paste' || event.type === 'focus_lost';
                return (
                  <div key={i}
                    title={`${EVENT_LABELS[event.type]} · ${formatTimestamp(event.timestamp)}${event.detail ? `\n"${event.detail.slice(0, 80)}"` : ''}`}
                    style={{
                      position: 'absolute',
                      left: `calc(12px + (100% - 24px) * ${x})`,
                      top: '50%', transform: 'translate(-50%, -50%)',
                      width: isSuspicious ? 14 : 9, height: isSuspicious ? 14 : 9,
                      borderRadius: '50%', background: EVENT_COLORS[event.type],
                      border: '2px solid #111', zIndex: isSuspicious ? 3 : 2, pointerEvents: 'none',
                    }}
                  />
                );
              })}

              <div style={{
                position: 'absolute', left: `calc(12px + (100% - 24px) * ${scrubPercent})`,
                top: 0, bottom: 0, transform: 'translateX(-50%)',
                width: 2, background: 'white', zIndex: 10, pointerEvents: 'none',
              }}>
                <div style={{
                  position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                  width: 14, height: 14, borderRadius: '50%', background: 'white', border: '2px solid #693ed6',
                }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {(Object.keys(EVENT_COLORS) as TrackingEventType[]).map((type) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: EVENT_COLORS[type] }} />
                  {EVENT_LABELS[type]}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
                <div style={{ width: 14, height: 7, borderRadius: 2, background: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,87,34,0.3) 2px, rgba(255,87,34,0.3) 4px)', border: '1px solid rgba(255,87,34,0.4)' }} />
                Away from page
              </div>
            </div>
          </div>

          {/* Code growth chart */}
          <CodeGrowthChart
            events={events}
            starterCode={starterCode}
            segments={segments}
            virtualDuration={virtualDuration}
            scrubPercent={scrubPercent}
          />

          {/* Code at scrub */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
                Code at <strong style={{ color: '#ccc' }}>{formatTimestamp(scrubTimestamp)}</strong>
              </p>
              {eventsAtScrub.length > 0 && (
                <div style={{ display: 'flex', gap: 6 }}>
                  {eventsAtScrub.map((e, i) => (
                    <span key={i} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 10,
                      background: `${EVENT_COLORS[e.type]}22`, color: EVENT_COLORS[e.type],
                      border: `1px solid ${EVENT_COLORS[e.type]}55`,
                    }}>
                      {EVENT_LABELS[e.type]}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <Editor
                height="200px" defaultLanguage="python" theme="vs-dark" value={codeAtScrub}
                options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', renderLineHighlight: 'none', domReadOnly: true }}
              />
            </div>
          </div>

          {/* Event log */}
          <p style={{ margin: '0 0 10px', fontSize: 13, color: '#888' }}>Full event log</p>
          <div style={{ background: '#1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
            {events.map((event, i) => {
              const pasteLines = event.type === 'paste' && event.detail
                ? event.detail.split('\n')
                : null;

              return (
                <div
                  key={i}
                  onClick={() => { setPlaying(false); setScrubPercent(realToVirtualPct(event.timestamp, segments, virtualDuration)); }}
                  style={{
                    padding: '10px 16px',
                    borderBottom: i < events.length - 1 ? '1px solid #2a2a2a' : 'none',
                    background: event.type === 'paste' || event.type === 'focus_lost' ? 'rgba(244,67,54,0.06)' : 'transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#252525'; }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.background =
                      event.type === 'paste' || event.type === 'focus_lost' ? 'rgba(244,67,54,0.06)' : 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: EVENT_COLORS[event.type], flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: EVENT_COLORS[event.type], width: 90, flexShrink: 0 }}>
                      {EVENT_LABELS[event.type]}
                    </span>
                    <span style={{ fontSize: 12, color: '#666', width: 80, flexShrink: 0 }}>
                      {formatTimestamp(event.timestamp)}
                    </span>
                    <span style={{ fontSize: 12, color: '#555' }}>+{formatTime(event.timestamp - startTime)}</span>
                    {pasteLines && (
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                        {pasteLines.length} line{pasteLines.length !== 1 ? 's' : ''} · {event.detail!.length} chars
                      </span>
                    )}
                    {!pasteLines && event.detail && (
                      <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                        &ldquo;{event.detail.slice(0, 60)}{event.detail.length > 60 ? '…' : ''}&rdquo;
                      </span>
                    )}
                  </div>

                  {/* Paste preview */}
                  {pasteLines && pasteLines.length > 0 && (
                    <div style={{
                      marginTop: 8, marginLeft: 20,
                      background: '#111', borderRadius: 6, padding: '8px 12px',
                      borderLeft: '2px solid #f4433666',
                    }}>
                      <pre style={{ margin: 0, fontSize: 11, color: '#888', fontFamily: 'monospace', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {pasteLines.slice(0, 5).join('\n')}{pasteLines.length > 5 ? `\n… +${pasteLines.length - 5} more lines` : ''}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SUBMISSION TAB ── */}
      {tab === 'submission' && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#888' }}>Final submission</p>
          <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a', marginBottom: 28 }}>
            <Editor
              height="320px" defaultLanguage="python" theme="vs-dark" value={finalCode}
              options={{ readOnly: true, fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on', renderLineHighlight: 'none', domReadOnly: true }}
            />
          </div>

          <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ccc' }}>Grade & Feedback</p>

            {initialScore !== null && (
              <div style={{ background: 'rgba(105,62,214,0.1)', border: '1px solid rgba(105,62,214,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#a87df0' }}>
                Auto-graded score: <strong>{initialScore} / {assignmentPoints} pts</strong> — you can override below.
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label style={{ fontSize: 13, color: '#888', width: 60, flexShrink: 0 }}>Score</label>
              <input type="number" min={0} max={assignmentPoints} value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="—"
                style={{ width: 80, background: '#111', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, outline: 'none' }} />
              <span style={{ fontSize: 13, color: '#555' }}>/ {assignmentPoints} pts</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, color: '#888' }}>Comments</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Leave feedback for the student..." rows={4}
                style={{ background: '#111', border: '1px solid #333', borderRadius: 8, padding: '10px 12px', color: '#e0e0e0', fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: saving ? '#444' : '#693ed6', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 600 }}>
                {saving ? 'Saving...' : 'Save Grade'}
              </button>
              {saveStatus === 'saved' && <span style={{ fontSize: 13, color: '#4caf50' }}>Saved</span>}
              {saveStatus === 'error' && <span style={{ fontSize: 13, color: '#f44336' }}>Failed to save</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}>
      ← Back to class
    </button>
  );
}

function Chip({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div style={{
      background: highlight ? `${color}22` : '#1e1e1e',
      border: `1px solid ${highlight ? color ?? '#693ed6' : '#2a2a2a'}`,
      borderRadius: 8, padding: '8px 14px',
    }}>
      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: highlight ? color : 'white' }}>{value}</p>
    </div>
  );
}
