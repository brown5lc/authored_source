import ClassCard from "../components/ClassCard";

function Dashboard() {
  return (
    <div>
      <h1>My Classes</h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <ClassCard className="Operating Systems" />
        <ClassCard className="Artificial Intelligence" />
        <ClassCard className="Networking" />
        <ClassCard className="Cyber Security" />
        <ClassCard className="Virtual, Augmented, and Mixed Reality" />
      </div>
    </div>
  );
}

export default Dashboard;
