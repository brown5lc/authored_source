import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { STUDENTS } from '../../data/users';
import { getClass } from '../../data/classes';
import PageHeader from '../../components/PageHeader';
import { API_BASE } from '../../lib/api';

interface Assignment {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  points: number;
}

export default function ClassPage() {
  const navigate = useNavigate();
  const { classId = 'cs101' } = useParams<{ classId: string }>();
  const classInfo = getClass(classId);
  const { currentUser } = useUser();
  const { role } = currentUser;

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submittedUserIds, setSubmittedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setAssignments([]);
    fetch(`${API_BASE}/api/assignments?classId=${classId}`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => {});
  }, [classId]);

  // For professor/TA: load who has submitted each assignment
  useEffect(() => {
    if (role !== 'professor' && role !== 'ta') return;
    if (assignments.length === 0) return;

    Promise.all(
      assignments.map((a) =>
        fetch(`${API_BASE}/api/submissions/assignment/${a.id}`)
          .then((r) => r.json())
          .catch(() => [])
      )
    ).then((results) => {
      const ids = new Set<string>();
      results.flat().forEach((s: { userId: string }) => ids.add(s.userId));
      setSubmittedUserIds(ids);
    });
  }, [role, assignments]);

  // For student: check submission status per assignment
  const [submittedAssignmentIds, setSubmittedAssignmentIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (role !== 'student' || assignments.length === 0) return;
    Promise.all(
      assignments.map((a) =>
        fetch(`${API_BASE}/api/submissions/${currentUser.id}/${a.id}`)
          .then((r) => (r.ok ? a.id : null))
          .catch(() => null)
      )
    ).then((results) => {
      setSubmittedAssignmentIds(new Set(results.filter(Boolean) as string[]));
    });
  }, [role, currentUser.id, assignments]);

  return (
    <div>
      <PageHeader
        title={classInfo?.name ?? classId.toUpperCase()}
        subtitle={classInfo ? `${classInfo.term} · ${classInfo.instructor}` : undefined}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#666' }}>Assignments</p>
        {role === 'professor' && (
          <button
            onClick={() => navigate(`/class/${classId}/assignments/new`)}
            style={{
              padding: '7px 16px',
              borderRadius: 8,
              border: '1px solid #693ed6',
              background: 'transparent',
              color: '#a87df0',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            + New Assignment
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p style={{ color: '#555', fontSize: 14 }}>Loading assignments...</p>
      ) : (
        assignments.map((assignment) => (
          <div
            key={assignment.id}
            style={{
              background: '#1e1e1e',
              borderRadius: 12,
              padding: '20px 24px',
              marginTop: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0 }}>{assignment.title}</h3>
                <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
                  {assignment.subtitle ? `${assignment.subtitle} · ` : ''}Due {assignment.dueDate} · {assignment.points} pts
                </p>
              </div>

              {role === 'student' && (
                submittedAssignmentIds.has(assignment.id) ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: 'rgba(76, 175, 80, 0.12)',
                      border: '1px solid rgba(76, 175, 80, 0.35)',
                      color: '#4caf50',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      Submitted
                    </span>
                    <button
                      onClick={() => navigate(`/class/${classId}/assignment/${assignment.id}`)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: 8,
                        border: '1px solid #333',
                        background: 'transparent',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: 13,
                      }}
                    >
                      Edit &amp; Resubmit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/class/${classId}/assignment/${assignment.id}`)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#693ed6',
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 14,
                    }}
                  >
                    Start Assignment
                  </button>
                )
              )}
              {role === 'professor' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => navigate(`/class/${classId}/assignments/${assignment.id}/edit`)}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 8,
                      border: '1px solid #333',
                      background: 'transparent',
                      color: '#888',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (!confirm(`Delete "${assignment.title}"? This cannot be undone.`)) return;
                      fetch(`${API_BASE}/api/assignments/${assignment.id}`, { method: 'DELETE' })
                        .then((r) => { if (r.ok) setAssignments((prev) => prev.filter((a) => a.id !== assignment.id)); })
                        .catch(() => {});
                    }}
                    style={{
                      padding: '7px 16px',
                      borderRadius: 8,
                      border: '1px solid #4a1a1a',
                      background: 'transparent',
                      color: '#c94040',
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>

            {/* Student submission list — visible to professor and TA */}
            {(role === 'professor' || role === 'ta') && (
              <div style={{ marginTop: 20, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
                <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>Student submissions</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STUDENTS.map((student) => {
                    const submitted = submittedUserIds.has(student.id);
                    return (
                      <div
                        key={student.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: '#151515',
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: student.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: 'white',
                            }}
                          >
                            {student.initials}
                          </div>
                          <span style={{ fontSize: 14 }}>{student.name}</span>
                        </div>

                        {submitted ? (
                          <button
                            onClick={() =>
                              navigate(
                                `/class/${classId}/assignment/${assignment.id}/timeline/${student.id}`
                              )
                            }
                            style={{
                              padding: '6px 14px',
                              borderRadius: 6,
                              border: '1px solid #693ed6',
                              background: 'transparent',
                              color: '#a87df0',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            View Timeline
                          </button>
                        ) : (
                          <span style={{ fontSize: 13, color: '#555' }}>No submission yet</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
