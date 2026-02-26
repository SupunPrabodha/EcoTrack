import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";
import AdminRoute from "./auth/AdminRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Emissions from "./pages/Emissions";
import Goals from "./pages/Goals";
import Recommendations from "./pages/Recommendations";
import Admin from "./pages/Admin";
import Map from "./pages/Map";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
      <Route path="/emissions" element={<ProtectedRoute><Emissions /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><Goals /></ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
      <Route path="/map" element={<ProtectedRoute><Map /></ProtectedRoute>} />

      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />

      <Route path="*" element={<div className="min-h-screen grid place-items-center text-slate-300">Page not found</div>} />
    </Routes>
  );
}
