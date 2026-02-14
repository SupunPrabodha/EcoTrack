export default function Card({ title, children }) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 shadow-xl">
      {title && <div className="text-sm text-slate-300 mb-3">{title}</div>}
      {children}
    </div>
  );
}
