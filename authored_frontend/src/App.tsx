import "./App.css";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Homepage";
import Grades from "./pages/Grades";
import ResponsiveAppBar from "./components/ResponsiveAppBar";
import Drawer from "./components/Drawer";
import Agenda from "./pages/Agenda";
import FreeCode from "./pages/FreeCode";

function App() {
  return (
    <div>
      <ResponsiveAppBar />
      <div style={{ display: "flex", width: "100%" }}>
        <Drawer />
        <div style={{ padding: "24px", flex: 1 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/free-code" element={<FreeCode />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default App;
