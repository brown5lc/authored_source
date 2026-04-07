import "./App.css";
import { Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Homepage";
import Grades from "./pages/Grades";
import Agenda from "./pages/Agenda";
import FreeCode from "./pages/FreeCode";
import ClassPage from "./pages/class-pages/ClassPage";
import AssignmentIDE from "./pages/AssignmentIDE";
import Timeline from "./pages/Timeline";
import CreateAssignment from "./pages/CreateAssignment";
import ResponsiveAppBar from "./components/ResponsiveAppBar";
import Drawer from "./components/Drawer";

function AppWithTheme() {
  return (
    <div>
      <ResponsiveAppBar />
      <div style={{ display: "flex", width: "100%" }}>
        <Drawer />
        <div style={{ padding: "24px", flex: 1, minWidth: 0 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/grades" element={<Grades />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/free-code" element={<FreeCode />} />
            <Route path="/class/:classId" element={<ClassPage />} />
            <Route path="/class/:classId/assignment/:assignmentId" element={<AssignmentIDE />} />
            <Route path="/class/:classId/assignment/:assignmentId/timeline/:userId" element={<Timeline />} />
            <Route path="/class/:classId/assignments/new" element={<CreateAssignment />} />
            <Route path="/class/:classId/assignments/:assignmentId/edit" element={<CreateAssignment />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default AppWithTheme;
