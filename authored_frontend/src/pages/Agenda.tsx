import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { API_BASE } from '../lib/api';
import PageHeader from '../components/PageHeader';

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  classId: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseDueDate(dueDate: string): Date | null {
  if (!dueDate) return null;
  // ISO format from date input: 2026-04-10
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    const [y, m, d] = dueDate.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // Human format from seed: "Apr 10, 2026"
  const d = new Date(dueDate);
  return isNaN(d.getTime()) ? null : d;
}

export default function Agenda() {
  const navigate = useNavigate();
  const { currentUser } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  useEffect(() => {
    fetch(`${API_BASE}/api/assignments`)
      .then((r) => r.json())
      .then(setAssignments)
      .catch(() => {});
  }, []);

  if (currentUser.role !== 'student') {
    return (
      <div>
        <PageHeader title="Agenda" />
        <p style={{ color: '#555', fontSize: 14 }}>The agenda is only available to students.</p>
      </div>
    );
  }

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map day-of-month → assignments due that day
  const dueMap = new Map<number, Assignment[]>();
  for (const a of assignments) {
    if (!a.dueDate) continue;
    const d = parseDueDate(a.dueDate);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) continue;
    const day = d.getDate();
    if (!dueMap.has(day)) dueMap.set(day, []);
    dueMap.get(day)!.push(a);
  }

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Assignment due dates" />

      {/* Month navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <button onClick={prevMonth} style={navBtnStyle}>‹</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#e0e0e0', minWidth: 160, textAlign: 'center' }}>
          {MONTH_NAMES[month]} {year}
        </span>
        <button onClick={nextMonth} style={navBtnStyle}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#555', fontWeight: 600, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((day, i) => {
          const dayAssignments = day ? (dueMap.get(day) ?? []) : [];
          return (
            <div
              key={i}
              style={{
                minHeight: 80,
                background: day ? '#1a1a1a' : 'transparent',
                border: day ? `1px solid ${isToday(day!) ? '#693ed6' : '#2a2a2a'}` : 'none',
                borderRadius: 8,
                padding: day ? '8px' : 0,
              }}
            >
              {day && (
                <>
                  <div style={{
                    fontSize: 12,
                    fontWeight: isToday(day) ? 700 : 400,
                    color: isToday(day) ? '#a87df0' : '#666',
                    marginBottom: 4,
                  }}>
                    {day}
                  </div>
                  {dayAssignments.map((a) => (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/class/${a.classId ?? 'cs101'}/assignment/${a.id}`)}
                      title={a.title}
                      style={{
                        background: 'rgba(105,62,214,0.2)',
                        border: '1px solid rgba(105,62,214,0.4)',
                        borderRadius: 4,
                        padding: '3px 6px',
                        fontSize: 11,
                        color: '#c4a9f7',
                        cursor: 'pointer',
                        marginBottom: 3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {a.title}
                    </div>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid #333',
  color: '#888',
  cursor: 'pointer',
  borderRadius: 6,
  width: 32,
  height: 32,
  fontSize: 18,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};
