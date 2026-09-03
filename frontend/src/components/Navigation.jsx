import {
  ShieldCheck,
  UploadCloud,
  LayoutGrid,
  Scale,
  UserCheck,
  Plus,
} from "lucide-react";

export default function Navigation({
  activeTab,
  onTabChange,
  candidateCount,
  demographicsCount,
  decisionSummary,
  onOpenExportModal,
  onResetDemo,
  isOpen,
}) {
  const reviewedCount = decisionSummary?.reviewed_count ?? 0;

  return (
    <aside 
      className={`bg-dashboard-sidebar h-full flex flex-col rounded-r-3xl text-slate-300 shadow-2xl z-40 relative transition-all duration-300 ${
        isOpen ? "w-64 py-6 px-4 opacity-100" : "w-0 py-6 px-0 opacity-0 overflow-hidden"
      }`}
    >
      {/* Top bar with logo */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="text-lg font-bold text-white tracking-tight">
          BlindSpot
        </h1>
      </div>

      {/* Main CTA Button */}
      <div className="px-2 mb-8">
        <button
          onClick={() => onTabChange("upload")}
          className="w-full flex items-center justify-center gap-2 bg-white text-dashboard-sidebar hover:bg-slate-100 py-3 rounded-full font-semibold transition"
        >
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
            <Plus className="h-3.5 w-3.5" />
          </div>
          New Analysis
        </button>
      </div>

      {/* Workflow Tab Navigation */}
      <nav className="flex-1 space-y-2">
        {/* Tab 1: Configure & Upload */}
        <button
          type="button"
          onClick={() => onTabChange("upload")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition ${
            activeTab === "upload"
              ? "bg-white text-brand-500 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload</span>
        </button>

        {/* Tab 2: Dual Shortlists & Evidence */}
        <button
          type="button"
          onClick={() => onTabChange("shortlist")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition ${
            activeTab === "shortlist"
              ? "bg-white text-brand-500 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
          <span className="flex-1 text-left">Shortlist</span>
          {candidateCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "shortlist"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-700 text-white"
              }`}
            >
              {candidateCount}
            </span>
          )}
        </button>

        {/* Tab 3: Bias Analytics & Parity Audit */}
        <button
          type="button"
          onClick={() => onTabChange("audit")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition ${
            activeTab === "audit"
              ? "bg-white text-brand-500 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <Scale className="h-4 w-4" />
          <span className="flex-1 text-left">Analytics</span>
          {demographicsCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "audit"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-700 text-white"
              }`}
            >
              {demographicsCount}
            </span>
          )}
        </button>

        {/* Tab 4: HR Review & Final Decisions */}
        <button
          type="button"
          onClick={() => onTabChange("review")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-semibold transition ${
            activeTab === "review"
              ? "bg-white text-brand-500 shadow-md"
              : "text-slate-400 hover:text-white hover:bg-slate-800/50"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span className="flex-1 text-left">HR Review</span>
          {candidateCount > 0 && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                activeTab === "review"
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-700 text-white"
              }`}
            >
              {reviewedCount}/{candidateCount}
            </span>
          )}
        </button>
      </nav>

      {/* Bottom Actions (Export / Reset) previously in header */}
      <div className="mt-auto space-y-2 pt-6 border-t border-slate-800">
        <button
          type="button"
          onClick={onOpenExportModal}
          disabled={candidateCount === 0}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Export Report
        </button>
        <button
          type="button"
          onClick={onResetDemo}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-900/50 bg-transparent px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition"
        >
          Reset Session
        </button>
      </div>
    </aside>
  );
}
