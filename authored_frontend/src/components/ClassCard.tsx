import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SWATCHES = [
  '#693ed6', '#2196f3', '#00bcd4', '#009688',
  '#4caf50', '#ff9800', '#f44336', '#e91e63',
];

function useClassColor(classId: string) {
  const key = `class-color-${classId}`;
  const [color, setColor] = useState(() => localStorage.getItem(key) ?? '#693ed6');
  function save(c: string) {
    setColor(c);
    localStorage.setItem(key, c);
  }
  return [color, save] as const;
}

interface ClassCardProps {
  classId: string;
  name: string;
  instructor: string;
  term: string;
  percentage?: number | null;   // student grade %, null = no data yet
  submittedCount?: number;
  totalCount?: number;
}

export default function ClassCard({
  classId,
  name,
  instructor,
  term,
  percentage,
  submittedCount,
  totalCount,
}: ClassCardProps) {
  const navigate = useNavigate();
  const [color, setColor] = useClassColor(classId);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [pickerOpen]);

  const shortName = name.split(':')[1]?.trim() ?? name;

  return (
    <div
      style={{
        background: '#1a1a1a',
        border: '1px solid #2a2a2a',
        borderRadius: 12,
        overflow: 'visible',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
        position: 'relative',
      }}
      onClick={() => navigate(`/class/${classId}`)}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = color)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a2a2a')}
    >
      {/* Color band */}
      <div
        style={{
          height: 10,
          background: color,
          borderRadius: '11px 11px 0 0',
          position: 'relative',
        }}
        onClick={(e) => {
          e.stopPropagation();
          setPickerOpen((v) => !v);
        }}
        title="Change color"
      />

      {/* Color picker popover */}
      {pickerOpen && (
        <div
          ref={pickerRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 18,
            left: 12,
            zIndex: 100,
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: 10,
            padding: 10,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
        >
          {SWATCHES.map((s) => (
            <button
              key={s}
              onClick={() => { setColor(s); setPickerOpen(false); }}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: s,
                border: color === s ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '14px 18px 18px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 12, color, fontWeight: 600 }}>
          {classId.toUpperCase()}
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 15, color: '#ddd', fontWeight: 600 }}>
          {shortName}
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: '#555' }}>
          {instructor} · {term}
        </p>

        {/* Percentage */}
        {percentage !== undefined && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
              <p style={{ margin: 0, fontSize: 11, color: '#555' }}>
                {submittedCount}/{totalCount} submitted
              </p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: percentage === null ? '#444' : '#ddd' }}>
                {percentage === null ? '—' : `${percentage}%`}
              </p>
            </div>
            <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${percentage ?? 0}%`,
                background: color,
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        )}

        {/* Submission count (prof/TA view — no percentage) */}
        {percentage === undefined && submittedCount !== undefined && (
          <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
            {submittedCount}/{totalCount} submitted
          </p>
        )}
      </div>
    </div>
  );
}
