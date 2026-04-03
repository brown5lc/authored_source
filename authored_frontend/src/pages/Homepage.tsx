import ClassCard from "../components/ClassCard";
import PageHeader from "../components/PageHeader";

function Dashboard() {
  return (
    <div>
      <PageHeader title="My Classes" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
        }}
      >
        <ClassCard className="CS 101: Intro to Programming" classId="cs101" />
      </div>
    </div>
  );
}

export default Dashboard;
