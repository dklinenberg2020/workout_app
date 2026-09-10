import { NavLink, Route, Routes } from "react-router-dom";
import Log from "./pages/Log";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Exercises from "./pages/Exercises";
import Report from "./pages/Report";

export default function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Log />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
      <nav className="tabbar no-print">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Log
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => (isActive ? "active" : "")}>
          History
        </NavLink>
        <NavLink to="/progress" className={({ isActive }) => (isActive ? "active" : "")}>
          Progress
        </NavLink>
        <NavLink to="/exercises" className={({ isActive }) => (isActive ? "active" : "")}>
          Exercises
        </NavLink>
        <NavLink to="/report" className={({ isActive }) => (isActive ? "active" : "")}>
          Report
        </NavLink>
      </nav>
    </>
  );
}
