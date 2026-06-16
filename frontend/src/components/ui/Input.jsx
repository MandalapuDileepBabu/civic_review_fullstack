export default function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <input
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <textarea
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20 ${className}`}
        rows={4}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <select
        className={`w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-civic-500 focus:outline-none focus:ring-2 focus:ring-civic-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
