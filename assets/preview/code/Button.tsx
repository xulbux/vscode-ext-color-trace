export function ActionButton({ label }: { label: string }) {
  return (
    <button
      className="bg-indigo-500 hover:bg-indigo-600 text-white
                 border border-indigo-700/50 shadow-md
                 focus:ring-2 focus:ring-indigo-300
                 disabled:bg-slate-400 disabled:text-slate-200">
      <span className="text-slate-100/90 drop-shadow-sm">{label}</span>
    </button>
  );
}
