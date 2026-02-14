import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    try {
      await login(email, password);
      nav("/");
    } catch (e) {
      setErr(e.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-slate-900/60 border border-slate-800 p-6">
        <div className="text-xl font-semibold mb-1">Welcome back</div>
        <div className="text-sm text-slate-400 mb-6">Log in to track your climate impact.</div>

        {err && <div className="mb-4 text-sm text-red-300 bg-red-950/40 border border-red-900 rounded-xl p-3">{err}</div>}

        <label className="text-xs text-slate-400">Email</label>
        <input className="w-full mt-1 mb-4 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none"
          value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="text-xs text-slate-400">Password</label>
        <input type="password" className="w-full mt-1 mb-6 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 outline-none"
          value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="w-full rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-slate-950 font-semibold py-2">
          Login
        </button>

        <div className="text-xs text-slate-500 mt-4">
          Demo: register via API or change defaults.
        </div>
      </form>
    </div>
  );
}
