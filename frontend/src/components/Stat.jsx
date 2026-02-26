export default function Stat({ label, value, sub }) {
	return (
		<div className="glass-card rounded-2xl p-6 group hover:scale-[1.02] transition-all duration-300">
			<div className="text-xs font-medium text-emerald-400/70 uppercase tracking-wider mb-2">{label}</div>
			<div className="mt-2 text-4xl font-bold tracking-tight bg-gradient-to-br from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
				{value}
			</div>
			{sub ? (
				<div className="mt-3 text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
					{sub}
				</div>
			) : null}
			<div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
		</div>
	);
}

