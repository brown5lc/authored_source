import { Link } from 'react-router-dom';

export default function Drawer(){
    return (
        <div
        style={{
            width: "240px",
            height: "100vh",
            backgroundColor: "#111",
            color: "white",
            padding: "16px"
        }} 
        >
            <h3>Menu</h3>
            <div><Link to="/">Dashboard</Link></div>
            <div><Link to="/grades">Grades</Link></div>
            <div><Link to="/agenda">Agenda</Link></div>
            <div><Link to="/free-code">Free Code</Link></div>
        </div>
    )
}