import { useState, useEffect } from "react";
import {
  X,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Scale,
  FileText,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { exportAuditReportJSON, exportAuditReportCSV, exportAuditReportPDF } from "../api";

export default function ExportReportModal({ isOpen, onClose }) {
  const [reportData, setReportData] = useState(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      exportAuditReportJSON()
        .then((data) => setReportData(data))
        .catch((err) => console.error("Failed to load audit report:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadCSV = async () => {
    try {
      const blob = await exportAuditReportCSV();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_audit_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download CSV report.");
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await exportAuditReportPDF();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance_audit_report_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download PDF report.");
    }
  };

  const handleDownloadJSON = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance_audit_report_${reportData.report_id}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    if (!reportData) return;
    navigator.clipboard.writeText(JSON.stringify(reportData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 border border-purple-100 text-purple-700 shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Hiring Compliance & Decision Audit Report
                </h3>
                <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 border border-purple-200">
                  UGESP 29 C.F.R. § 1607
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Official compliance audit report documenting AI evaluations,
                EEOC Four-Fifths parity metrics, and human override decisions.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => setActiveTab("summary")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === "summary"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Executive Summary View
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("json")}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === "json"
                  ? "bg-white text-indigo-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Raw Compliance JSON
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <Download className="h-3.5 w-3.5 text-brand-600" />
              <span>Download CSV</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-xs transition"
            >
              <Download className="h-3.5 w-3.5 text-rose-600" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-sm transition"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="text-xs">Compiling compliance audit report...</p>
            </div>
          ) : !reportData ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No audit records currently available.
            </div>
          ) : activeTab === "summary" ? (
            <div className="space-y-6">
              {/* Top report meta bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Report ID
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {reportData.report_id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Total Applicants
                  </span>
                  <span className="font-bold text-slate-800">
                    {reportData.summary.total_applicants} Candidates
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    EEOC Parity Status
                  </span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {reportData.summary.eeoc_four_fifths_parity_status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Lowest Impact Ratio
                  </span>
                  <span className="font-bold text-slate-800">
                    {reportData.summary.lowest_parity_impact_ratio}
                  </span>
                </div>
              </div>

              {/* Four-Fifths Parity Statement Banner */}
              <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-4 space-y-1 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  <span>EEOC Four-Fifths Parity Audit Result</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {reportData.summary.parity_improvement_note}
                </p>
              </div>

              {/* Candidate Decision & Override Audit Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Candidate Decisions & Human Override Audit Trail
                </h4>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5">Candidate</th>
                        <th className="px-3 py-2.5">AI Evidence</th>
                        <th className="px-3 py-2.5">ATS Match</th>
                        <th className="px-3 py-2.5">Human Decision</th>
                        <th className="px-3 py-2.5">
                          Reviewer Rationale & Override
                        </th>
                        <th className="px-3 py-2.5">Reviewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {reportData.candidate_decisions.map((cand) => (
                        <tr
                          key={cand.candidate_identifier}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-3 py-2.5">
                            <div className="font-bold text-slate-800">
                              {cand.anonymized_id}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {cand.candidate_name}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-bold text-indigo-700">
                            {cand.evidence_score}%
                          </td>
                          <td className="px-3 py-2.5 font-semibold text-slate-600">
                            {cand.ats_score}%
                          </td>
                          <td className="px-3 py-2.5">
                            {cand.decision === "APPROVED" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-2.5 w-2.5" />{" "}
                                Approved
                              </span>
                            )}
                            {cand.decision === "FLAGGED_FOR_INTERVIEW" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                                Flagged
                              </span>
                            )}
                            {cand.decision === "REJECTED" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                                Rejected
                              </span>
                            )}
                            {cand.decision === "PENDING" && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 italic max-w-xs truncate">
                            {cand.override_reason || "Standard evaluation."}
                          </td>
                          <td className="px-3 py-2.5 text-slate-500 font-medium">
                            {cand.reviewer_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* Raw JSON View */
            <div className="relative rounded-xl border border-slate-200 bg-slate-900 p-4 text-emerald-400 font-mono text-xs overflow-x-auto">
              <button
                type="button"
                onClick={handleCopyJSON}
                className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-sans font-semibold text-slate-300 hover:text-white"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copied ? "Copied!" : "Copy JSON"}</span>
              </button>
              <pre>{JSON.stringify(reportData, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Audit report fulfills EEOC uniform guidelines on employee
              selection procedures.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
