import { useNavigate } from 'react-router-dom';

type ClassCardProps = {
  className?: string;
  classId?: string;
};

export default function ClassCard({ className, classId }: ClassCardProps) {
  const navigate = useNavigate();

  return (
    <div
      onClick={classId ? () => navigate(`/class/${classId}`) : undefined}
      style={{
        background: "#1e1e1e",
        padding: "16px",
        borderRadius: "12px",
        cursor: classId ? "pointer" : "default",
        border: classId ? "1px solid #333" : "1px solid transparent",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        if (classId) (e.currentTarget as HTMLDivElement).style.borderColor = "#693ed6";
      }}
      onMouseLeave={(e) => {
        if (classId) (e.currentTarget as HTMLDivElement).style.borderColor = "#333";
      }}
    >
      <h3 style={{ margin: 0 }}>{className}</h3>
      {classId && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#888" }}>
          Click to open →
        </p>
      )}
    </div>
  );
}
