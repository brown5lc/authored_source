import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { CLASSES } from '../data/classes';
import { STUDENTS, getUserById } from '../data/users';
import { API_BASE } from '../lib/api';
import ClassCard from '../components/ClassCard';

interface Assignment {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  points: number;
  classId: string;
}

interface RecentSubmission {
  userId: string;
  assignmentId: string;
  submittedAt: number;
  score: number | null;
  assignmentTitle: string;
  classId: string;
  points: number;
}

function timeAgo(unixSec: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{
      background: '#1a1a1a',
      border: '1px solid #2a2a2a',
      borderRadius: 12,
      padding: '20px 24px',
      flex: 1,
    }}>
      <p style={{ margin: '0 0 4px', fontSize: 13, color: '#555' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#e0e0e0' }}>{value}</p>
    </div>
  );
}

function ProfessorDashboard() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentSubmission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/submissions/recent?limit=8`)
      .then((r) => r.json())
      .then(setRecent)
      .catch(() => {});
    fetch(`${API_BASE}/api/assignments`)
      .then((r) => r.json())
      .then((data: Assignment[]) => {
        setAssignments(data);
        return Promise.all(
          data.map((a) =>
            fetch(`${API_BASE}/api/submissions/assignment/${a.id}`)
              .then((r) => r.json())
              .then((subs: { userId: string }[]) => ({ classId: a.classId, count: subs.length }))
              .catch(() => ({ classId: a.classId, count: 0 }))
          )
        );
      })
      .then((counts) => {
        const byClass: Record<string, number> = {};
        counts.forEach(({ classId, count }) => {
          byClass[classId] = (byClass[classId] ?? 0) + count;
        });
        setSubmissionCounts(byClass);
      })
      .catch(() => {});
  }, []);


  return (
    <div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#555' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Stat strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        <StatCard label="Students" value={STUDENTS.length} />
        <StatCard label="Assignments" value={assignments.length} />
        <StatCard label="Recent Submissions" value={recent.length} />
      </div>

      {/* Recent activity */}
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Recent Submissions
      </p>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
        {recent.length === 0 ? (
          <p style={{ margin: 0, padding: '20px 24px', color: '#444', fontSize: 14 }}>No submissions yet.</p>
        ) : (
          recent.map((s, i) => {
            const user = getUserById(s.userId);
            return (
              <div
                key={`${s.userId}-${s.assignmentId}`}
                onClick={() => navigate(`/class/${s.classId}/assignment/${s.assignmentId}/timeline/${s.userId}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid #222',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#222')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: user.color, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                }}>
                  {user.initials}
                </div>

                {/* Name + assignment */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, color: '#ddd', fontWeight: 500 }}>{user.name}</p>
                  <p style={{ margin: '1px 0 0', fontSize: 12, color: '#555' }}>
                    {s.assignmentTitle} · {s.classId.toUpperCase()}
                  </p>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {s.score !== null ? (
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#a87df0' }}>
                      {s.score}/{s.points}
                    </p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 13, color: '#444' }}>—</p>
                  )}
                  <p style={{ margin: '1px 0 0', fontSize: 11, color: '#444' }}>{timeAgo(s.submittedAt)}</p>
                </div>

                <span style={{ color: '#333', fontSize: 14, flexShrink: 0 }}>→</span>
              </div>
            );
          })
        )}
      </div>

      {/* Classes */}
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Classes
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {CLASSES.map((c) => {
          const classAssignments = assignments.filter((a) => a.classId === c.id);
          return (
            <ClassCard
              key={c.id}
              classId={c.id}
              name={c.name}
              instructor={c.instructor}
              term={c.term}
              submittedCount={submissionCounts[c.id] ?? 0}
              totalCount={classAssignments.length * STUDENTS.length}
            />
          );
        })}
      </div>
    </div>
  );
}

function StudentDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<Record<string, number | null>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/assignments`)
      .then((r) => r.json())
      .then((data: Assignment[]) => {
        setAssignments(data);
        return Promise.all(
          data.map((a) =>
            fetch(`${API_BASE}/api/submissions/${currentUser.id}/${a.id}`)
              .then((r) => (r.ok ? r.json() : null))
              .catch(() => null)
              .then((sub) => ({ id: a.id, score: sub?.score ?? null, submitted: !!sub }))
          )
        );
      })
      .then((results) => {
        const ids = new Set<string>();
        const sc: Record<string, number | null> = {};
        results.forEach(({ id, score, submitted }) => {
          if (submitted) { ids.add(id); sc[id] = score; }
        });
        setSubmittedIds(ids);
        setScores(sc);
      })
      .catch(() => {});
  }, [currentUser.id]);

  const upcoming = assignments
    .filter((a) => !submittedIds.has(a.id) && a.dueDate)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const nextUp = upcoming[0] ?? null;

  // Per-class stats
  const countsByClass = CLASSES.map((c) => {
    const classAssignments = assignments.filter((a) => a.classId === c.id);
    const submitted = classAssignments.filter((a) => submittedIds.has(a.id)).length;
    const totalPoints = classAssignments.reduce((s, a) => s + a.points, 0);
    const earned = classAssignments.reduce((s, a) => s + (scores[a.id] ?? 0), 0);
    const percentage = totalPoints > 0 && submitted > 0
      ? Math.round((earned / totalPoints) * 100)
      : null;
    return { ...c, submitted, total: classAssignments.length, percentage };
  });

  return (
    <div>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#555' }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

      {/* Next up */}
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Next Up
      </p>
      <div style={{ marginBottom: 32 }}>
        {nextUp ? (
          <div style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 12, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 13, color: '#693ed6', fontWeight: 600 }}>{nextUp.classId.toUpperCase()}</p>
              <p style={{ margin: '0 0 6px', fontSize: 18, color: '#ddd', fontWeight: 600 }}>{nextUp.title}</p>
              <p style={{ margin: 0, fontSize: 13, color: '#555' }}>
                Due {nextUp.dueDate} · {nextUp.points} pts
              </p>
            </div>
            <button
              onClick={() => navigate(`/class/${nextUp.classId}/assignment/${nextUp.id}`)}
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: '#693ed6', color: 'white',
                cursor: 'pointer', fontSize: 14, fontWeight: 600, flexShrink: 0,
              }}
            >
              Start
            </button>
          </div>
        ) : (
          <div style={{
            background: '#1a1a1a', border: '1px solid #2a2a2a',
            borderRadius: 12, padding: '20px 24px',
          }}>
            <p style={{ margin: 0, fontSize: 14, color: '#444' }}>All caught up — no pending assignments.</p>
          </div>
        )}
      </div>

      {/* Classes */}
      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Classes
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {countsByClass.map((c) => (
          <ClassCard
            key={c.id}
            classId={c.id}
            name={c.name}
            instructor={c.instructor}
            term={c.term}
            percentage={c.percentage}
            submittedCount={c.submitted}
            totalCount={c.total}
          />
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { currentUser } = useUser();
  const isProfOrTA = currentUser.role === 'professor' || currentUser.role === 'ta';

  return (
    <div>
      <h2 style={{ margin: '0 0 4px' }}>
        {isProfOrTA ? 'Dashboard' : `Hi, ${currentUser.name.split(' ')[0]}`}
      </h2>
      {isProfOrTA ? <ProfessorDashboard /> : <StudentDashboard />}
    </div>
  );
}
