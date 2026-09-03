import { useState } from "react";
import {
  UserCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Filter,
  FileSearch,
  MessageSquare,
  Sparkles,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { submitHRDecision } from "../api";

export default function HRReviewConsole({
  candidates,
  decisionSummary,
  onDecisionUpdated,
  onSelectCandidateForInspection,
  onOpenExportModal,
}) {
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [overrideModalCandidate, setOverrideModalCandidate] = useState(null);
  const [pendingDecisionType, setPendingDecisionType] = useState("APPROVED");
  const [overrideNote, setOverrideNote] = useState("");
  const [reviewerName, setReviewerName] = useState("HR Hiring Lead");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map candidate identifier to decision record
  const decisionsMap = new Map();
  if (decisionSummary) {
    for (const d of decisionSummary.decisions) {
      decisionsMap.set(d.candidate_identifier, d);
      decisionsMap.set(d.anonymized_id, d);
    }
  }

  const handleOpenDecisionDialog = (candidate, decision) => {
    // If approving or rejecting, prompt with override dialog to allow recording written justification
    setOverrideModalCandidate(candidate);
    setPendingDecisionType(decision);
    setOverrideNote("");
  };

  const handleConfirmDecision = async () => {
    if (!overrideModalCandidate) return;
    setIsSubmitting(true);
    try {
      const record = await submitHRDecision(
        overrideModalCandidate.filename,
        pendingDecisionType,
        overrideNote.trim() || undefined,
        reviewerName.trim() || "HR Hiring Lead",
      );
      onDecisionUpdated(record);
      setOverrideModalCandidate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDecision = async (candidate, decision) => {
    try {
      const record = await submitHRDecision(
        candidate.filename,
        decision,
        undefined,
        reviewerName.trim() || "HR Hiring Lead",
      );
      onDecisionUpdated(record);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to record decision.");
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    const dec =
      decisionsMap.get(c.filename)?.decision ||
      decisionsMap.get(c.anonymized_id)?.decision ||
      "PENDING";
    if (filterStatus === "ALL") return true;
    return dec === filterStatus;
  });

  const reviewedCount = decisionSummary?.reviewed_count ?? 0;
  const totalCount = candidates.length;
  const progressPct =
    totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header & Governance Statement */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 shadow-sm">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                Human-in-the-Loop HR Governance Workspace
              </h2>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Zero Auto-Rejections
              </span>
            </div>
            <p className="text-xs text-slate-500">
              AI provides blind evidence recommendations; human recruiters
              maintain final decision authority and compliance oversight.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenExportModal}
          disabled={totalCount === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition disabled:opacity-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Compliance Audit Report</span>
        </button>
      </div>

      {/* Progress & Stat Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Progress */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Review Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="my-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {reviewedCount} of {totalCount} reviewed
          </p>
        </div>

        {/* Approved */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Approved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-900">
            {decisionSummary?.approved_count ?? 0}
          </div>
          <p className="text-[11px] text-emerald-600">Selected for shortlist</p>
        </div>

        {/* Flagged for Interview */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Interview Flag</span>
            <HelpCircle className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-indigo-900">
            {decisionSummary?.flagged_count ?? 0}
          </div>
          <p className="text-[11px] text-indigo-600">
            Deep-dive technical review
          </p>
        </div>

        {/* Rejected */}
        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-rose-700">
            <span>Rejected</span>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-rose-900">
            {decisionSummary?.rejected_count ?? 0}
          </div>
          <p className="text-[11px] text-rose-600">Human confirmed decline</p>
        </div>

        {/* Pending */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Pending Review</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-2xl font-extrabold text-slate-800">
            {decisionSummary?.pending_count ?? totalCount}
          </div>
          <p className="text-[11px] text-slate-400">Awaiting human review</p>
        </div>
      </div>

      {/* Filter Tabs & Candidate Review Cards */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filter:
            </span>
            {[
              "ALL",
              "PENDING",
              "APPROVED",
              "FLAGGED_FOR_INTERVIEW",
              "REJECTED",
            ].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setFilterStatus(status)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  filterStatus === status
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-medium">
            Showing {filteredCandidates.length} Candidates
          </span>
        </div>

        {/* Candidate Cards Grid */}
        <div className="space-y-3">
          {filteredCandidates.map((candidate) => {
            const decRecord =
              decisionsMap.get(candidate.filename) ||
              decisionsMap.get(candidate.anonymized_id);
            const currentDecision = decRecord?.decision || "PENDING";
            const overrideReason = decRecord?.override_reason;

            return (
              <div
                key={candidate.filename}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-300 transition space-y-4"
              >
                {/* Top candidate banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 font-bold text-xs text-slate-700">
                      #{candidate.rank_evidence}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {candidate.anonymized_id}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          ({candidate.candidate_name})
                        </span>
                        {candidate.rank_delta > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Sparkles className="h-2.5 w-2.5" />
                            Evidence Surge (+{candidate.rank_delta})
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {candidate.filename}
                      </p>
                    </div>
                  </div>

                  {/* Current Decision Badge */}
                  <div>
                    {currentDecision === "APPROVED" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        APPROVED FOR NEXT ROUND
                      </span>
                    )}
                    {currentDecision === "FLAGGED_FOR_INTERVIEW" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800 border border-indigo-200">
                        <HelpCircle className="h-3.5 w-3.5" />
                        FLAGGED FOR INTERVIEW
                      </span>
                    )}
                    {currentDecision === "REJECTED" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 border border-rose-200">
                        <XCircle className="h-3.5 w-3.5" />
                        REJECTED BY HR
                      </span>
                    )}
                    {currentDecision === "PENDING" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                        <Clock className="h-3.5 w-3.5" />
                        AWAITING REVIEW
                      </span>
                    )}
                  </div>
                </div>

                {/* Score & Rationale Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between font-semibold text-slate-600">
                      <span>Evidence AI Score</span>
                      <span className="font-extrabold text-indigo-600">
                        {candidate.evidence_score}%
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-500">
                      <span>ATS Match Score</span>
                      <span>{candidate.ats_score}%</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Rank Shift Delta</span>
                      <span
                        className={
                          candidate.rank_delta > 0
                            ? "text-emerald-600 font-bold"
                            : "text-slate-500"
                        }
                      >
                        {candidate.rank_delta > 0
                          ? `+${candidate.rank_delta} Surged`
                          : candidate.rank_delta}
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-1 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="font-bold text-slate-700 block">
                      AI Evaluation Rationale
                    </span>
                    <p className="text-slate-600 leading-relaxed line-clamp-2">
                      {candidate.rationale}
                    </p>
                  </div>
                </div>

                {/* Human Override Justification Note (if present) */}
                {overrideReason && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                      <MessageSquare className="h-3.5 w-3.5 text-indigo-600" />
                      <span>
                        Human Reviewer Justification (
                        {decRecord?.reviewer_name || "HR Reviewer"}):
                      </span>
                    </div>
                    <p className="text-indigo-800 italic pl-5">
                      "{overrideReason}"
                    </p>
                  </div>
                )}

                {/* Decision Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onSelectCandidateForInspection(candidate)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    <FileSearch className="h-3.5 w-3.5" />
                    <span>Inspect Verifiable Proof & Redaction</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDecisionDialog(candidate, "APPROVED")
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                        currentDecision === "APPROVED"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDecisionDialog(
                          candidate,
                          "FLAGGED_FOR_INTERVIEW",
                        )
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                        currentDecision === "FLAGGED_FOR_INTERVIEW"
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "bg-white text-indigo-700 border border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Flag for Interview
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenDecisionDialog(candidate, "REJECTED")
                      }
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                        currentDecision === "REJECTED"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "bg-white text-rose-700 border border-rose-300 hover:bg-rose-50"
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Reject
                    </button>

                    {currentDecision !== "PENDING" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickDecision(candidate, "PENDING")
                        }
                        className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium"
                        title="Reset decision to Pending"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Override & Decision Justification Dialog */}
      {overrideModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Record HR Decision: {pendingDecisionType.replace(/_/g, " ")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalCandidate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-1 text-xs text-slate-600">
              <p>
                Candidate:{" "}
                <strong>{overrideModalCandidate.anonymized_id}</strong> (
                {overrideModalCandidate.candidate_name})
              </p>
              <p>
                Evidence Score:{" "}
                <strong>{overrideModalCandidate.evidence_score}%</strong> (Rank
                #{overrideModalCandidate.rank_evidence}) • ATS Match:{" "}
                <strong>{overrideModalCandidate.ats_score}%</strong>
              </p>
            </div>

            {/* Justification Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Human Override Rationale / Reviewer Note (Compliance Record)
              </label>
              <textarea
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                placeholder="e.g. Approved due to strong verified proof in production React deployment despite lower ATS keyword score."
                rows={3}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />

              <p className="text-[11px] text-slate-400">
                This rationale is immutably logged in the EEOC compliance audit
                report.
              </p>
            </div>

            {/* Reviewer Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Reviewer Name
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideModalCandidate(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecision}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <span>Confirm & Log Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
