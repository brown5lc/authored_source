import { useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext';
import { STUDENTS } from '../../data/users';
import PageHeader from '../../components/PageHeader';

const ASSIGNMENT_ID = 'hello-output';
const CLASS_ID = 'cs101';

const ASSIGNMENT = {
  id: ASSIGNMENT_ID,
  title: 'Hello, Output!',
  subtitle: 'Print Statements',
  dueDate: 'Apr 10, 2026',
  points: 10,
};

function sessionKey(userId: string) {
  return `authored_session_${userId}_${ASSIGNMENT_ID}`;
}

function hasSubmission(userId: string): boolean {
  const raw = localStorage.getItem(sessionKey(userId));
  if (!raw) return false;
  try {
    const events = JSON.parse(raw);
    return Array.isArray(events) && events.length > 0;
  } catch {
    return false;
  }
}

export default function ClassPage() {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const { role } = currentUser;

  return (
    <div>
      <PageHeader title="CS 101: Intro to Programming" subtitle="Spring 2026 · Prof. Johnson" />

      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#666' }}>Assignments</p>

      {/* Assignment row */}
      <div
        style={{
          background: '#1e1e1e',
          borderRadius: 12,
          padding: '20px 24px',
          marginTop: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0 }}>{ASSIGNMENT.title}</h3>
            <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>
              {ASSIGNMENT.subtitle} · Due {ASSIGNMENT.dueDate} · {ASSIGNMENT.points} pts
            </p>
          </div>

          {role === 'student' && (
            <button
              onClick={() => navigate(`/class/${CLASS_ID}/assignment/${ASSIGNMENT.id}`)}
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
              {hasSubmission(currentUser.id) ? 'Continue' : 'Start Assignment'}
            </button>
          )}
        </div>

        {/* Student submission list — visible to professor and TA */}
        {(role === 'professor' || role === 'ta') && (
          <div style={{ marginTop: 20, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#888' }}>Student submissions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STUDENTS.map((student) => {
                const submitted = hasSubmission(student.id);
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
                            `/class/${CLASS_ID}/assignment/${ASSIGNMENT.id}/timeline/${student.id}`
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
    </div>
  );
}
