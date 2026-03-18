import ResponsiveAppBar from '../components/ResponsiveAppBar'
import Drawer from '../components/Drawer';
import ClassCard from '../components/ClassCard';

function Dashboard(){
    return(
        <div>
        <ResponsiveAppBar />
        <div style={{ display: "flex", width: "100%" }}>
            <Drawer />
            <div style={{ padding: "24px" }}>
                <h1>My Classes</h1>
                <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                    marginTop: "16px"
                }} 
                >
                    <ClassCard /> 
                    <ClassCard />
                    <ClassCard />
                    <ClassCard />

                </div>
            </div>
        </div>
        </div>
    )
}

export default Dashboard;