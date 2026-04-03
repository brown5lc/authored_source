import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { getUserById } from '../data/users';
import type { TrackingEvent, TrackingEventType } from '../context/TrackingContext';

const STARTER_CODE = `# Hello, Output!
# Complete each print statement below

print()  # Print "Hello, World!"
print()  # Print your name
print()  # Print the sum of 7 + 3
`;

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

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function getCodeAtTime(events: TrackingEvent[], timestamp: number): string {
  const snapshotEvents = events.filter((e) => e.codeSnapshot && e.timestamp <= timestamp);
  if (snapshotEvents.length === 0) return STARTER_CODE;
  return snapshotEvents[snapshotEvents.length - 1].codeSnapshot!;
}

function getEventsNearTime(
  events: TrackingEvent[],
  timestamp: number,
  windowMs = 500
): TrackingEvent[] {
  return events.filter((e) => Math.abs(e.timestamp - timestamp) <= windowMs);
}

export default function Timeline() {
  const navigate = useNavigate();
  const { userId, assignmentId } = useParams<{ userId: string; assignmentId: string }>();
  const student = getUserById(userId ?? '');
  const [events, setEvents] = useState<TrackingEvent[]>([]);

  const timelineBarRef = useRef<HTMLDivElement>(null);
  const [scrubPercent, setScrubPercent] = useState(0);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const key = `authored_session_${userId}_${assignmentId}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try { setEvents(JSON.parse(raw)); } catch { /* ignore */ }
    }
  }, [userId, assignmentId]);

  // ── Scrubber drag logic ──────────────────────────────────────────────────
  function percentFromMouse(clientX: number): number {
    const bar = timelineBarRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function handleBarMouseDown(e: React.MouseEvent) {
    isDraggingRef.current = true;
    setScrubPercent(percentFromMouse(e.clientX));
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isDraggingRef.current) setScrubPercent(percentFromMouse(e.clientX));
    }
    function onMouseUp() {
      isDraggingRef.current = false;
    }
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const startTime = events.length > 0 ? events[0].timestamp : 0;
  const endTime = events.length > 0 ? events[events.length - 1].timestamp : 0;
  const duration = endTime - startTime;

  const scrubTimestamp = startTime + duration * scrubPercent;
  const codeAtScrub = getCodeAtTime(events, scrubTimestamp);
  const eventsAtScrub = getEventsNearTime(events, scrubTimestamp, Math.max(500, duration * 0.02));
  const pasteCount = events.filter((e) => e.type === 'paste').length;
  const focusLostCount = events.filter((e) => e.type === 'focus_lost').length;
  const suspiciousEvents = events.filter((e) => e.type === 'paste' || e.type === 'focus_lost');

  function getXPercent(timestamp: number): number {
    if (duration === 0) return 0;
    return ((timestamp - startTime) / duration) * 100;
  }

  if (events.length === 0) {
    return (
      <div>
        <BackButton onClick={() => navigate('/class/cs101')} />
        <p style={{ fontSize: 18, fontWeight: 600, color: '#e0e0e0', margin: '0 0 8px' }}>Student Timeline</p>
        <p style={{ color: '#888' }}>
          No session data yet for <strong>{student.name}</strong>. Have them complete the assignment first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <BackButton onClick={() => navigate('/class/cs101')} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: student.color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'white',
            flexShrink: 0,
          }}
        >
          {student.initials}
        </div>
        <div>
          <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e0e0e0' }}>
            {student.name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#666' }}>
            Hello, Output! · CS 101
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, marginTop: 12, flexWrap: 'wrap' }}>
        <Chip label="Duration" value={formatTime(duration)} />
        <Chip label="Edits" value={String(events.filter((e) => e.type === 'edit').length)} />
        <Chip label="Pastes" value={String(pasteCount)} highlight={pasteCount > 0} color="#f44336" />
        <Chip label="Left page" value={String(focusLostCount)} highlight={focusLostCount > 0} color="#ff5722" />
        <Chip label="Runs" value={String(events.filter((e) => e.type === 'run').length)} />
      </div>

      {/* ── Scrubber ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#666' }}>{formatTimestamp(startTime)}</span>
          <span style={{ fontSize: 12, color: '#aaa' }}>
            ↕ scrub to replay · {formatTimestamp(scrubTimestamp)}
            {duration > 0 && ` (+${formatTime(scrubTimestamp - startTime)})`}
          </span>
          <span style={{ fontSize: 12, color: '#666' }}>{formatTimestamp(endTime)}</span>
        </div>

        {/* Timeline bar */}
        <div
          ref={timelineBarRef}
          onMouseDown={handleBarMouseDown}
          style={{
            position: 'relative',
            height: 48,
            background: '#1a1a1a',
            borderRadius: 10,
            cursor: 'ew-resize',
            userSelect: 'none',
            border: '1px solid #2a2a2a',
          }}
        >
          {/* Track */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 12,
              right: 12,
              height: 2,
              background: '#2e2e2e',
              transform: 'translateY(-50%)',
              borderRadius: 1,
            }}
          />

          {/* Filled track up to scrub position */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: 12,
              width: `calc(${scrubPercent * 100}% - 12px)`,
              height: 2,
              background: '#693ed6',
              transform: 'translateY(-50%)',
              borderRadius: 1,
              pointerEvents: 'none',
            }}
          />

          {/* Event dots */}
          {events.map((event, i) => {
            const x = getXPercent(event.timestamp);
            const isSuspicious = event.type === 'paste' || event.type === 'focus_lost';
            return (
              <div
                key={i}
                title={`${EVENT_LABELS[event.type]} · ${formatTimestamp(event.timestamp)}${event.detail ? `\n"${event.detail.slice(0, 80)}"` : ''}`}
                style={{
                  position: 'absolute',
                  left: `calc(12px + (100% - 24px) * ${x / 100})`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: isSuspicious ? 14 : 9,
                  height: isSuspicious ? 14 : 9,
                  borderRadius: '50%',
                  background: EVENT_COLORS[event.type],
                  border: '2px solid #111',
                  zIndex: isSuspicious ? 3 : 2,
                  pointerEvents: 'none',
                }}
              />
            );
          })}

          {/* Scrubber handle */}
          <div
            style={{
              position: 'absolute',
              left: `calc(12px + (100% - 24px) * ${scrubPercent})`,
              top: 0,
              bottom: 0,
              transform: 'translateX(-50%)',
              width: 2,
              background: 'white',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {/* Handle knob */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 14,
                height: 14,
                borderRadius: '50%',
                background: 'white',
                border: '2px solid #693ed6',
              }}
            />
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          {(Object.keys(EVENT_COLORS) as TrackingEventType[]).map((type) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#666' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: EVENT_COLORS[type] }} />
              {EVENT_LABELS[type]}
            </div>
          ))}
        </div>
      </div>

      {/* ── Code preview at scrub position ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
            Code at <strong style={{ color: '#ccc' }}>{formatTimestamp(scrubTimestamp)}</strong>
          </p>
          {eventsAtScrub.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {eventsAtScrub.map((e, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 10,
                    background: `${EVENT_COLORS[e.type]}22`,
                    color: EVENT_COLORS[e.type],
                    border: `1px solid ${EVENT_COLORS[e.type]}55`,
                  }}
                >
                  {EVENT_LABELS[e.type]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
          <Editor
            height="200px"
            defaultLanguage="python"
            theme="vs-dark"
            value={codeAtScrub}
            options={{
              readOnly: true,
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              domReadOnly: true,
            }}
          />
        </div>
      </div>

      {/* ── Flagged activity ── */}
      {suspiciousEvents.length > 0 && (
        <div
          style={{
            background: '#2a1a1a',
            border: '1px solid #f44336',
            borderRadius: 10,
            padding: '14px 18px',
            marginBottom: 24,
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 600, color: '#f44336', fontSize: 14 }}>
            ⚠ Flagged Activity
          </p>
          {suspiciousEvents.map((e, i) => (
            <div key={i} style={{ fontSize: 13, color: '#ccc', marginBottom: 4 }}>
              <span style={{ color: EVENT_COLORS[e.type] }}>{EVENT_LABELS[e.type]}</span>
              {' '}at {formatTimestamp(e.timestamp)}
              {e.detail && (
                <span style={{ color: '#888' }}>
                  {' '}·{' '}&ldquo;{e.detail.slice(0, 80)}{e.detail.length > 80 ? '…' : ''}&rdquo;
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Event log ── */}
      <p style={{ margin: '0 0 10px', fontSize: 13, color: '#888' }}>Full event log</p>
      <div style={{ background: '#1e1e1e', borderRadius: 10, overflow: 'hidden' }}>
        {events.map((event, i) => (
          <div
            key={i}
            onClick={() => setScrubPercent(duration > 0 ? (event.timestamp - startTime) / duration : 0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              borderBottom: i < events.length - 1 ? '1px solid #2a2a2a' : 'none',
              background:
                event.type === 'paste' || event.type === 'focus_lost'
                  ? 'rgba(244,67,54,0.06)'
                  : 'transparent',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#252525'; }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background =
                event.type === 'paste' || event.type === 'focus_lost'
                  ? 'rgba(244,67,54,0.06)'
                  : 'transparent';
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: EVENT_COLORS[event.type],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: EVENT_COLORS[event.type], width: 90, flexShrink: 0 }}>
              {EVENT_LABELS[event.type]}
            </span>
            <span style={{ fontSize: 12, color: '#666', width: 80, flexShrink: 0 }}>
              {formatTimestamp(event.timestamp)}
            </span>
            <span style={{ fontSize: 12, color: '#555' }}>+{formatTime(event.timestamp - startTime)}</span>
            {event.detail && (
              <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                &ldquo;{event.detail.slice(0, 80)}{event.detail.length > 80 ? '…' : ''}&rdquo;
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}
    >
      ← Back to class
    </button>
  );
}

function Chip({
  label,
  value,
  highlight,
  color,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  color?: string;
}) {
  return (
    <div
      style={{
        background: highlight ? `${color}22` : '#1e1e1e',
        border: `1px solid ${highlight ? color ?? '#693ed6' : '#2a2a2a'}`,
        borderRadius: 8,
        padding: '8px 14px',
      }}
    >
      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: highlight ? color : 'white' }}>{value}</p>
    </div>
  );
}
