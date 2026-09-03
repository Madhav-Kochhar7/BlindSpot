import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Award,
  FileSearch,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  CheckCircle2,
  HelpCircle,
  XCircle,
  Clock,
} from "lucide-react";

function scoreBadge(score) {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 35) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export default function CandidateTable({
  candidates,
  onSelectCandidate,
  decisionsMap,
}) {
  const [sortField, setSortField] = useState("evidence_score");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return 0;
    });
  }, [candidates, sortField, sortAsc]);

  if (candidates.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3.5">Candidate / Blind ID</th>
              <th
                className="px-4 py-3.5 cursor-pointer select-none hover:text-slate-800 transition"
                onClick={() => handleSort("evidence_score")}
              >
                <div className="flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Evidence AI Score</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                className="px-4 py-3.5 cursor-pointer select-none hover:text-slate-800 transition"
                onClick={() => handleSort("ats_score")}
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-slate-400" />
                  <span>ATS Match %</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                className="px-4 py-3.5 cursor-pointer select-none hover:text-slate-800 transition"
                onClick={() => handleSort("rank_delta")}
              >
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
                  <span>Rank Shift Delta</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3.5">HR Review Decision</th>
              <th className="px-4 py-3.5">Verified Proofs</th>
              <th className="px-4 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {sortedCandidates.map((candidate) => {
              const verifiedItems = candidate.extracted_evidence.filter(
                (e) => e.confidence >= 0.5,
              );
              const decision =
                decisionsMap?.get(candidate.filename) ||
                candidate.decision ||
                "PENDING";

              return (
                <tr
                  key={candidate.filename}
                  className="hover:bg-slate-50/80 transition cursor-pointer"
                  onClick={() => onSelectCandidate(candidate)}
                >
                  {/* Candidate Column */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {candidate.anonymized_id}
                      </span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-100">
                        Blind
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {candidate.candidate_name}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {candidate.filename}
                    </div>
                    {candidate.error && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-red-500">
                        <AlertTriangle className="h-3 w-3" />
                        {candidate.error}
                      </div>
                    )}
                  </td>

                  {/* Evidence Score Column */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold border ${scoreBadge(
                        candidate.evidence_score,
                      )}`}
                    >
                      <Award className="h-3 w-3" />
                      {candidate.evidence_score}%
                    </span>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">
                      Evidence Rank #{candidate.rank_evidence}
                    </div>
                  </td>

                  {/* ATS Score Column */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${scoreBadge(
                        candidate.ats_score,
                      )}`}
                    >
                      {candidate.ats_score}%
                    </span>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {candidate.matched_keywords.length}/
                      {candidate.total_keywords} keywords
                    </div>
                  </td>

                  {/* Rank Delta Column */}
                  <td className="px-4 py-3.5">
                    {candidate.rank_delta > 0 ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <TrendingUp className="h-3.5 w-3.5" />+
                        {candidate.rank_delta} Surged
                      </div>
                    ) : candidate.rank_delta < 0 ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                        <TrendingDown className="h-3.5 w-3.5" />
                        {candidate.rank_delta} Lower
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">
                        Neutral (0)
                      </span>
                    )}
                  </td>

                  {/* HR Decision Badge Column */}
                  <td className="px-4 py-3.5">
                    {decision === "APPROVED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Approved
                      </span>
                    )}
                    {decision === "FLAGGED_FOR_INTERVIEW" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-800 border border-indigo-200">
                        <HelpCircle className="h-3 w-3" />
                        Interview
                      </span>
                    )}
                    {decision === "REJECTED" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-800 border border-rose-200">
                        <XCircle className="h-3 w-3" />
                        Rejected
                      </span>
                    )}
                    {decision === "PENDING" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                        <Clock className="h-3 w-3" />
                        Pending
                      </span>
                    )}
                  </td>

                  {/* Verified Skills / Provenance Snippet */}
                  <td className="px-4 py-3.5 max-w-xs">
                    {verifiedItems.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {verifiedItems.slice(0, 2).map((item, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 border border-indigo-100"
                          >
                            ✓ {item.skill}
                          </span>
                        ))}
                        {verifiedItems.length > 2 && (
                          <span className="text-[11px] text-slate-400 self-center">
                            +{verifiedItems.length - 2} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        No verified proofs
                      </span>
                    )}
                  </td>

                  {/* Action Column */}
                  <td className="px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCandidate(candidate);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 transition shadow-xs"
                    >
                      <FileSearch className="h-3.5 w-3.5" />
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
