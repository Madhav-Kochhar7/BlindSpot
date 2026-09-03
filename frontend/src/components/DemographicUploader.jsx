import { useState, useRef } from "react";
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  AlertCircle,
  Database,
} from "lucide-react";
import { uploadDemographics } from "../api";

export default function DemographicUploader({
  summary,
  onDemographicsUpdated,
  candidateCount,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const fileInputRef = useRef(null);

  const handleGenerateDemo = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await uploadDemographics(undefined, true);
      onDemographicsUpdated(res.summary);
      setSuccessMsg(res.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to generate demo demographics.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a valid CSV file (.csv).");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await uploadDemographics(file, false);
      onDemographicsUpdated(res.summary);
      setSuccessMsg(res.message);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload demographic CSV.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isConfigured = summary && summary.total_demographics > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 text-purple-700 shadow-sm">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800">
                Demographic Identity Data (Isolated Governance Layer)
              </h3>
              <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                EEOC Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Strictly decoupled in isolated storage. Scoring models have zero
              access to this data.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Demo Generation Button */}
          <button
            type="button"
            onClick={handleGenerateDemo}
            disabled={isLoading || candidateCount === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 transition disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Auto-Generate Demo Demographics</span>
          </button>
        </div>
      </div>

      {/* Upload Box & Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CSV Upload Zone */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100/70 hover:border-purple-300 transition cursor-pointer text-center"
        >
          <FileSpreadsheet className="h-6 w-6 text-purple-600 mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">
            Upload Custom Demographic CSV
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Columns: candidate_id, gender, ethnicity, age_group
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Isolation Architecture Card */}
        <div className="rounded-xl border border-slate-100 bg-purple-50/40 p-4 space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-bold text-purple-900">
            <ShieldCheck className="h-4 w-4 text-purple-700" />
            <span>Blind Audition Safeguard</span>
          </div>
          <p className="text-[11px] leading-relaxed text-purple-800">
            Demographic data is securely mapped by anonymized IDs and only
            accessed post-scoring by the Four-Fifths compliance engine to
            calculate disparate impact ratios.
          </p>
          {isConfigured && (
            <div className="pt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>
                {summary.total_demographics} demographic profile(s) mapped &
                ready for audit.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600 border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Distribution Breakdown Pills */}
      {isConfigured && summary.distribution && (
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Current Applicant Pool Demographics
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gender */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                Gender
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(summary.distribution.gender || {}).map(
                  ([g, count]) => (
                    <span
                      key={g}
                      className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 shadow-xs"
                    >
                      {g}: <strong>{count}</strong>
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Ethnicity */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                Ethnicity / Race
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(summary.distribution.ethnicity || {}).map(
                  ([e, count]) => (
                    <span
                      key={e}
                      className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 shadow-xs"
                    >
                      {e}: <strong>{count}</strong>
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Age Group */}
            <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                Age Groups
              </span>
              <div className="flex flex-wrap gap-1">
                {Object.entries(summary.distribution.age_group || {}).map(
                  ([a, count]) => (
                    <span
                      key={a}
                      className="rounded bg-white px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200 shadow-xs"
                    >
                      {a}: <strong>{count}</strong>
                    </span>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
