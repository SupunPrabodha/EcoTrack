import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="sticky top-0 z-20 bg-slate-950/70 backdrop-blur border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="font-semibold tracking-tight">EcoTrack</div>
        <div className="flex gap-4 text-sm text-slate-300">
          <Link to="/">Dashboard</Link>
          <Link to="/habits">Habits</Link>
          <Link to="/goals">Goals</Link>
          <Link to="/recommendations">Recommendations</Link>
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-slate-400">{user.email}</span>}
          {user && (
            <button
              onClick={logout}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
