export default function JobDescriptionInput({ value, onChange }) {
  const wordCount = value.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="job-description"
        className="text-sm font-semibold text-slate-700"
      >
        Job Description
      </label>
      <textarea
        id="job-description"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the job description here..."
        rows={10}
        className="w-full resize-y rounded-lg border border-slate-300 bg-transparent p-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />

      <p className="text-xs text-slate-400">{wordCount} words</p>
    </div>
  );
}
