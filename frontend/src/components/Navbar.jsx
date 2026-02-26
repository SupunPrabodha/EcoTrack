import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { IconLeaf } from "./Icons";

export default function Navbar() {
  const { user, logout } = useAuth();
  const loc = useLocation();

  const linkClass = (to) =>
    `px-3 py-2 rounded-lg transition-all duration-200 ${
      loc.pathname === to 
        ? "text-emerald-400 bg-emerald-500/10 shadow-sm shadow-emerald-500/20" 
        : "text-slate-300 hover:text-emerald-300 hover:bg-emerald-500/5"
    }`;

  return (
    <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-emerald-500/10 shadow-lg shadow-emerald-500/5">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="font-bold text-lg bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
          <span className="inline-flex items-center gap-2">
            <span className="text-emerald-300">
              <IconLeaf width={20} height={20} />
            </span>
            EcoTrack
          </span>
        </div>
        <div className="flex flex-wrap gap-1 text-sm">
          <Link className={linkClass("/")} to="/">Dashboard</Link>
          <Link className={linkClass("/habits")} to="/habits">Habits</Link>
          <Link className={linkClass("/emissions")} to="/emissions">Emissions</Link>
          <Link className={linkClass("/goals")} to="/goals">Goals</Link>
          <Link className={linkClass("/recommendations")} to="/recommendations">Recommendations</Link>
          <Link className={linkClass("/map")} to="/map">Map</Link>
          {user?.role === "admin" && <Link className={linkClass("/admin")} to="/admin">Admin</Link>}
        </div>
        <div className="flex items-center gap-3">
          {user && <span className="text-xs text-slate-400">{user.email}</span>}
          {user && (
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/20 text-sm transition-all duration-200"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
