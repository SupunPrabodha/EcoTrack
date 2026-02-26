export default function Card({ title, children }) {
  return (
    <div className="glass-card rounded-2xl p-6 transition-all duration-300 hover:scale-[1.01]">
      {title && (
        <div className="text-sm font-medium text-emerald-400/80 mb-4 uppercase tracking-wider">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
