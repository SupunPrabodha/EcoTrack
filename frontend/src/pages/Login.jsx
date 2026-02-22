import { useState } from "react";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";
import { IconBolt, IconGlobe, IconSparkles } from "../components/Icons";

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("Test User");
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      if (mode === "register") await register(name, email, password);
      else await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      
      <form onSubmit={submit} className="w-full max-w-md glass-card rounded-3xl p-8 relative z-10 shadow-2xl shadow-emerald-500/10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-float inline-flex justify-center text-emerald-300">
            <IconGlobe width={44} height={44} />
          </div>
          <div className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
            Welcome to EcoTrack
          </div>
          <div className="text-sm text-slate-400">Track your climate impact and make a difference</div>
        </div>

        {err && (
          <div className="mb-6 text-sm text-red-300 bg-red-950/40 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm">
            {err}
          </div>
        )}

        <div className="flex gap-3 mb-6 bg-slate-900/40 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === "login" 
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
              mode === "register" 
                ? "bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 shadow-lg shadow-emerald-500/10" 
                : "text-slate-400 hover:text-slate-300"
            }`}
          >
            Register
          </button>
        </div>

        {mode === "register" && (
          <div className="mb-5">
            <label htmlFor="name" className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mb-2 block">Name</label>
            <input
              id="name"
              name="name"
              className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="mb-5">
          <label htmlFor="email" className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mb-2 block">Email</label>
          <input 
            id="email"
            name="email"
            type="email"
            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mb-2 block">Password</label>
          <input 
            id="password"
            name="password"
            type="password" 
            className="w-full bg-slate-900/50 border border-emerald-500/20 rounded-xl px-4 py-3 outline-none focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
        </div>

        <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02]">
          {mode === "register" ? (
            <span className="inline-flex items-center justify-center gap-2">
              <IconSparkles width={18} height={18} />
              Create account
            </span>
          ) : (
            <span className="inline-flex items-center justify-center gap-2">
              <IconBolt width={18} height={18} />
              Login
            </span>
          )}
        </button>

        <div className="text-xs text-center text-slate-500 mt-6">
          Demo credentials prefilled • Secure authentication powered by JWT
        </div>
      </form>
    </div>
  );
}
