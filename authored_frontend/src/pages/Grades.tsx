import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { useUser } from '../context/UserContext';
import { STUDENTS } from '../data/users';
import { CLASSES } from '../data/classes';
import { API_BASE } from '../lib/api';

interface Assignment {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  points: number;
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function pct(earned: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((earned / total) * 100);
}

function gradeColor(p: number): string {
  if (p >= 80) return '#4caf50';
  if (p >= 60) return '#ff9800';
  return '#f44336';
}

// ── Professor gradebook ────────────────────────────────────────────────────

type SubmissionMap = Record<string, Record<string, { score: number | null }>>;

function ProfessorGrades() {
  const navigate = useNavigate();
  const [selectedClassId, setSelectedClassId] = useState(CLASSES[0].id);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissionMap, setSubmissionMap] = useState<SubmissionMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    async function load() {
      const fetched: Assignment[] = await fetch(`${API_BASE}/api/assignments?classId=${selectedClassId}`)
        .then((r) => r.json())
        .catch(() => []);

      setAssignments(fetched);

      const map: SubmissionMap = {};
      await Promise.all(
        fetched.map(async (a) => {
          const subs = await fetch(`${API_BASE}/api/submissions/assignment/${a.id}`)
            .then((r) => r.ok ? r.json() : [])
            .catch(() => []);
          map[a.id] = {};
          for (const s of subs) {
            map[a.id][s.userId] = { score: s.score ?? null };
          }
        })
      );

      setSubmissionMap(map);
      setLoading(false);
    }
    load();
  }, [selectedClassId]);

  const selectedClass = CLASSES.find((c) => c.id === selectedClassId)!;
  const totalPoints = assignments.reduce((s, a) => s + a.points, 0);

  return (
    <div>
      {/* Class tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #2a2a2a' }}>
        {CLASSES.map((cls) => (
          <button
            key={cls.id}
            onClick={() => setSelectedClassId(cls.id)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: `2px solid ${selectedClassId === cls.id ? '#693ed6' : 'transparent'}`,
              color: selectedClassId === cls.id ? '#a87df0' : '#666',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: selectedClassId === cls.id ? 600 : 400,
              padding: '8px 16px',
              marginBottom: -1,
            }}
          >
            {cls.id.toUpperCase()}
          </button>
        ))}
      </div>

      <p style={{ margin: '0 0 16px', fontSize: 13, color: '#666' }}>
        {selectedClass.name} · {STUDENTS.length} students · {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
      </p>

      {loading ? (
        <p style={{ color: '#555', fontSize: 14 }}>Loading grades...</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={th({ left: true })}>Student</th>
                  {assignments.map((a) => (
                    <th key={a.id} style={th()}>
                      <span style={{ display: 'block' }}>{a.title}</span>
                      <span style={{ fontSize: 11, color: '#555', fontWeight: 400 }}>{a.points} pts</span>
                    </th>
                  ))}
                  <th style={th()}>Total</th>
                </tr>
              </thead>
              <tbody>
                {STUDENTS.map((student, si) => {
                  let earned = 0;
                  let gradedPoints = 0;

                  return (
                    <tr key={student.id} style={{ background: si % 2 === 0 ? '#1a1a1a' : '#1e1e1e' }}>
                      <td style={td({ left: true })}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', background: student.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700, color: 'white', flexShrink: 0,
                          }}>
                            {student.initials}
                          </div>
                          {student.name}
                        </div>
                      </td>

                      {assignments.map((a) => {
                        const sub = submissionMap[a.id]?.[student.id];
                        const submitted = !!sub;
                        const score = sub?.score ?? null;
                        const isGraded = submitted && score !== null;

                        if (isGraded) { earned += score; gradedPoints += a.points; }

                        return (
                          <td key={a.id} style={td()}>
                            <button
                              onClick={() => navigate(`/class/${selectedClassId}/assignment/${a.id}/timeline/${student.id}`)}
                              disabled={!submitted}
                              style={{
                                background: 'none', border: 'none', cursor: submitted ? 'pointer' : 'default',
                                padding: 0, width: '100%',
                              }}
                            >
                              {isGraded ? (
                                <span style={{ color: gradeColor(pct(score, a.points)), fontWeight: 600 }}>
                                  {score}/{a.points}
                                </span>
                              ) : submitted ? (
                                <span style={{ color: '#ff9800' }}>Pending</span>
                              ) : (
                                <span style={{ color: '#444' }}>—</span>
                              )}
                            </button>
                          </td>
                        );
                      })}

                      <td style={td()}>
                        {gradedPoints > 0 ? (
                          <span style={{ color: gradeColor(pct(earned, gradedPoints)), fontWeight: 600 }}>
                            {pct(earned, gradedPoints)}%
                            <span style={{ fontSize: 11, color: '#555', fontWeight: 400, marginLeft: 4 }}>
                              ({earned}/{gradedPoints})
                            </span>
                          </span>
                        ) : (
                          <span style={{ color: '#444' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Class average row */}
                <tr style={{ borderTop: '1px solid #2a2a2a', background: '#111' }}>
                  <td style={{ ...td({ left: true }), color: '#666', fontSize: 13 }}>Class average</td>
                  {assignments.map((a) => {
                    const scores = STUDENTS
                      .map((s) => submissionMap[a.id]?.[s.id]?.score)
                      .filter((v): v is number => typeof v === 'number');
                    const avg = scores.length > 0
                      ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
                      : null;
                    return (
                      <td key={a.id} style={td()}>
                        {avg !== null ? (
                          <span style={{ color: gradeColor(pct(avg, a.points)), fontSize: 13 }}>
                            {avg}/{a.points}
                          </span>
                        ) : (
                          <span style={{ color: '#333' }}>—</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={td()}>
                    {(() => {
                      const allPcts = STUDENTS.map((student) => {
                        let earned = 0, gradedPts = 0;
                        for (const a of assignments) {
                          const score = submissionMap[a.id]?.[student.id]?.score;
                          if (typeof score === 'number') { earned += score; gradedPts += a.points; }
                        }
                        return gradedPts > 0 ? pct(earned, gradedPts) : null;
                      }).filter((v): v is number => v !== null);

                      if (allPcts.length === 0) return <span style={{ color: '#333' }}>—</span>;
                      const avg = Math.round(allPcts.reduce((s, v) => s + v, 0) / allPcts.length);
                      return <span style={{ color: gradeColor(avg), fontSize: 13 }}>{avg}%</span>;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {totalPoints > 0 && (
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#555' }}>
              Scores link to the student's timeline. Pending = submitted but not yet graded.
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── Student grade report ───────────────────────────────────────────────────

interface ClassGrades {
  classId: string;
  className: string;
  instructor: string;
  assignments: Assignment[];
  scores: Map<string, number | null>;
}

function StudentGrades() {
  const { currentUser } = useUser();
  const [classGrades, setClassGrades] = useState<ClassGrades[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const results = await Promise.all(
        CLASSES.map(async ({ id: classId, name: className, instructor }) => {
          const assignments: Assignment[] = await fetch(
            `${API_BASE}/api/assignments?classId=${classId}`
          ).then((r) => r.json()).catch(() => []);

          const scores = new Map<string, number | null>();
          await Promise.all(
            assignments.map((a) =>
              fetch(`${API_BASE}/api/submissions/${currentUser.id}/${a.id}`)
                .then((r) => r.ok ? r.json() : null)
                .then((data) => { if (data) scores.set(a.id, data.score ?? null); })
                .catch(() => {})
            )
          );

          return { classId, className, instructor, assignments, scores };
        })
      );
      setClassGrades(results);
      setLoading(false);
    }
    load();
  }, [currentUser.id]);

  if (loading) return <p style={{ color: '#555', fontSize: 14 }}>Loading grades...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
      {classGrades.map((cls) => {
        const gradedAssignments = cls.assignments.filter(
          (a) => cls.scores.has(a.id) && cls.scores.get(a.id) !== null
        );
        const totalPoints = gradedAssignments.reduce((s, a) => s + a.points, 0);
        const earnedPoints = gradedAssignments.reduce((s, a) => s + (cls.scores.get(a.id) as number), 0);
        const grade = gradedAssignments.length > 0 ? pct(earnedPoints, totalPoints) : null;
        const color = grade !== null ? gradeColor(grade) : '#444';

        return (
          <div key={cls.classId} style={{
            background: '#1e1e1e', borderRadius: 12,
            overflow: 'hidden', border: '1px solid #2a2a2a',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px 16px', borderBottom: '1px solid #2a2a2a',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>{cls.className}</h3>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: '#666' }}>{cls.instructor}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                {grade !== null ? (
                  <>
                    <span style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1 }}>{grade}%</span>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
                      {earnedPoints} / {totalPoints} pts
                    </p>
                  </>
                ) : (
                  <span style={{ fontSize: 14, color: '#555' }}>No grades yet</span>
                )}
              </div>
            </div>

            <div style={{ height: 4, background: '#111' }}>
              <div style={{
                height: '100%',
                width: grade !== null ? `${grade}%` : '0%',
                background: color,
                transition: 'width 0.6s ease',
                borderRadius: '0 2px 2px 0',
              }} />
            </div>

            <div style={{ padding: '8px 0' }}>
              {cls.assignments.length === 0 ? (
                <p style={{ margin: 0, padding: '12px 24px', fontSize: 13, color: '#555' }}>No assignments yet.</p>
              ) : (
                cls.assignments.map((assignment, i) => {
                  const submitted = cls.scores.has(assignment.id);
                  const score = cls.scores.get(assignment.id);
                  const isGraded = submitted && score !== null;
                  const dotColor = isGraded ? '#4caf50' : submitted ? '#ff9800' : '#333';

                  return (
                    <div key={assignment.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 24px',
                      borderTop: i > 0 ? '1px solid #252525' : 'none',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: dotColor,
                          border: submitted ? 'none' : '1px solid #444',
                          flexShrink: 0,
                        }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 14 }}>{assignment.title}</p>
                          <p style={{ margin: '1px 0 0', fontSize: 12, color: '#555' }}>
                            {assignment.subtitle ? `${assignment.subtitle} · ` : ''}
                            {assignment.dueDate ? `Due ${assignment.dueDate}` : ''}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        {isGraded ? (
                          <>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#4caf50' }}>
                              {score} / {assignment.points} pts
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#4caf50' }}>Graded</p>
                          </>
                        ) : submitted ? (
                          <>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#ff9800' }}>
                              — / {assignment.points} pts
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#ff9800' }}>Pending grade</p>
                          </>
                        ) : (
                          <>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#555' }}>
                              — / {assignment.points} pts
                            </p>
                            <p style={{ margin: '1px 0 0', fontSize: 12, color: '#555' }}>Not submitted</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────

export default function Grades() {
  const { currentUser } = useUser();
  const isProfessor = currentUser.role === 'professor' || currentUser.role === 'ta';

  return (
    <div>
      <PageHeader
        title="Grades"
        subtitle={isProfessor ? undefined : `Viewing as ${currentUser.name}`}
      />
      {isProfessor ? <ProfessorGrades /> : <StudentGrades />}
    </div>
  );
}

// ── Table styles ───────────────────────────────────────────────────────────

function th(opts: { left?: boolean } = {}): React.CSSProperties {
  return {
    padding: '10px 16px',
    textAlign: opts.left ? 'left' : 'center',
    fontSize: 13,
    fontWeight: 600,
    color: '#888',
    background: '#111',
    borderBottom: '1px solid #2a2a2a',
    whiteSpace: 'nowrap',
  };
}

function td(opts: { left?: boolean } = {}): React.CSSProperties {
  return {
    padding: '10px 16px',
    textAlign: opts.left ? 'left' : 'center',
    borderBottom: '1px solid #1a1a1a',
    color: '#ccc',
  };
}
