import { NavLink, Route, Routes } from "react-router-dom";
import Log from "./pages/Log";
import History from "./pages/History";
import Progress from "./pages/Progress";
import Exercises from "./pages/Exercises";

export default function App() {
  return (
    <>
      <main>
        <Routes>
          <Route path="/" element={<Log />} />
          <Route path="/history" element={<History />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/exercises" element={<Exercises />} />
        </Routes>
      </main>
      <nav className="tabbar">
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
      </nav>
    </>
  );
}
