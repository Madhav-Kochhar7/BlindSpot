import { useState, useMemo } from "react";
import {
  Sparkles,
  Layers,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Search,
  ArrowRight,
  Filter,
  Scale,
} from "lucide-react";

function scorePill(score) {
  if (score >= 75) return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (score >= 50) return "bg-blue-100 text-blue-800 border-blue-200";
  if (score >= 35) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

export default function DualShortlist({
  candidates,
  onSelectCandidate,
  onViewBiasAudit,
}) {
  const [filterSurgeOnly, setFilterSurgeOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter candidates based on search & surge toggle
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const matchesSearch =
        c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.anonymized_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.matched_keywords.some((k) =>
          k.toLowerCase().includes(searchQuery.toLowerCase()),
        );

      if (!matchesSearch) return false;
      if (filterSurgeOnly) return c.rank_delta > 0;
      return true;
    });
  }, [candidates, searchQuery, filterSurgeOnly]);

  // Sort candidate lists independently for the dual columns
  const atsSorted = useMemo(() => {
    return [...filteredCandidates].sort((a, b) => b.ats_score - a.ats_score);
  }, [filteredCandidates]);

  const evidenceSorted = useMemo(() => {
    return [...filteredCandidates].sort(
      (a, b) => b.evidence_score - a.evidence_score,
    );
  }, [filteredCandidates]);

  // Calculate high-level disparity insights
  const surgeCount = useMemo(
    () => candidates.filter((c) => c.rank_delta > 0).length,
    [candidates],
  );
  const topAtsPick = candidates.reduce(
    (prev, curr) => (curr.ats_score > prev.ats_score ? curr : prev),
    candidates[0],
  );
  const topEvidencePick = candidates.reduce(
    (prev, curr) => (curr.evidence_score > prev.evidence_score ? curr : prev),
    candidates[0],
  );

  const topPickMismatch = topAtsPick?.filename !== topEvidencePick?.filename;

  return (
    <div className="space-y-6">
      {/* Insight Callout Bar */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-purple-50/70 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-800">
                Dual Shortlist & Discrepancy Analysis
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Comparing keyword-based filtering against verified blind audition
              evidence.
              {surgeCount > 0 && (
                <span className="font-semibold text-indigo-700 ml-1">
                  {surgeCount} candidate{surgeCount > 1 ? "s" : ""} surged
                  higher under blind evidence evaluation.
                </span>
              )}
            </p>
          </div>

          {/* Quick Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidates or skills..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-slate-200 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterSurgeOnly(!filterSurgeOnly)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition shadow-xs ${
                filterSurgeOnly
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              {filterSurgeOnly ? "Showing Surges Only" : "Filter Surges Only"}
            </button>

            {onViewBiasAudit && (
              <button
                type="button"
                onClick={onViewBiasAudit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition shadow-xs"
              >
                <Scale className="h-3.5 w-3.5" />
                <span>EEOC Four-Fifths Audit</span>
              </button>
            )}
          </div>
        </div>

        {/* Top Pick Discrepancy Highlight */}
        {topPickMismatch && topAtsPick && topEvidencePick && (
          <div className="mt-4 pt-3 border-t border-indigo-100/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2 text-indigo-900">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                Ranking Divergence:
              </span>
              <span>
                ATS prefers <strong>{topAtsPick.candidate_name}</strong> (
                {topAtsPick.ats_score}%), while Evidence scoring ranks{" "}
                <strong>{topEvidencePick.anonymized_id}</strong> #1 (
                {topEvidencePick.evidence_score}%).
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectCandidate(topEvidencePick)}
              className="font-semibold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1"
            >
              Inspect #1 Evidence Pick <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Side-by-Side Dual Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Traditional ATS Keyword Ranking */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Layers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Traditional ATS Keyword Ranking
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ranked purely by keyword density & frequency
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {atsSorted.length} Candidates
            </span>
          </div>

          <div className="space-y-3">
            {atsSorted.map((candidate) => (
              <div
                key={`ats-${candidate.filename}`}
                onClick={() => onSelectCandidate(candidate)}
                className="group relative cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
                      #{candidate.rank_ats}
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-slate-800 group-hover:text-brand-600 transition">
                        {candidate.candidate_name}
                      </div>
                      <div className="text-xs text-slate-400">
                        {candidate.filename}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold border ${scorePill(
                        candidate.ats_score,
                      )}`}
                    >
                      {candidate.ats_score}% Match
                    </span>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {candidate.matched_keywords.length}/
                      {candidate.total_keywords} keywords
                    </div>
                  </div>
                </div>

                {/* Keyword tags */}
                <div className="mt-3 flex flex-wrap gap-1">
                  {candidate.matched_keywords.slice(0, 6).map((kw) => (
                    <span
                      key={kw}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                    >
                      {kw}
                    </span>
                  ))}
                  {candidate.matched_keywords.length > 6 && (
                    <span className="text-[11px] text-slate-400 self-center">
                      +{candidate.matched_keywords.length - 6} more
                    </span>
                  )}
                </div>

                {/* Rank divergence note on ATS card */}
                {candidate.rank_delta !== 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">
                      Evidence Audit Position:
                    </span>
                    {candidate.rank_delta > 0 ? (
                      <span className="font-medium text-emerald-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        Jumps to Rank #{candidate.rank_evidence} in AI Proof
                      </span>
                    ) : (
                      <span className="font-medium text-rose-500 flex items-center gap-1">
                        <TrendingDown className="h-3 w-3" />
                        Drops to Rank #{candidate.rank_evidence} in AI Proof
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN: Evidence-Based AI Ranking (Blind Audition) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Blind Evidence-Based Ranking
                </h4>
                <p className="text-[11px] text-indigo-600 font-medium">
                  Ranked by verified quotes & 4 weighted criteria
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold text-indigo-600">
              {evidenceSorted.length} Candidates
            </span>
          </div>

          <div className="space-y-3">
            {evidenceSorted.map((candidate) => {
              const isSurge = candidate.rank_delta > 0;
              return (
                <div
                  key={`evidence-${candidate.filename}`}
                  onClick={() => onSelectCandidate(candidate)}
                  className={`group relative cursor-pointer rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                    isSurge
                      ? "border-indigo-200 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 hover:border-indigo-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm">
                        #{candidate.rank_evidence}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-800 group-hover:text-indigo-600 transition">
                            {candidate.anonymized_id}
                          </span>
                          {isSurge && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200 animate-pulse">
                              <Sparkles className="h-2.5 w-2.5" />
                              Evidence Surge (+{candidate.rank_delta})
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {candidate.rationale}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-extrabold border ${scorePill(
                          candidate.evidence_score,
                        )}`}
                      >
                        {candidate.evidence_score}% Score
                      </span>
                      <div className="mt-1 text-[11px] text-slate-400">
                        {
                          candidate.extracted_evidence.filter(
                            (e) => e.confidence >= 0.5,
                          ).length
                        }{" "}
                        verified skills
                      </div>
                    </div>
                  </div>

                  {/* Criteria mini indicators */}
                  {candidate.criteria_breakdown && (
                    <div className="mt-3 grid grid-cols-4 gap-1.5 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 block">Tech (40%)</span>
                        <span className="font-bold text-slate-800">
                          {candidate.criteria_breakdown.technical_skills}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Project (25%)
                        </span>
                        <span className="font-bold text-slate-800">
                          {candidate.criteria_breakdown.project_experience}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Domain (20%)
                        </span>
                        <span className="font-bold text-slate-800">
                          {candidate.criteria_breakdown.domain_experience}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">
                          Metrics (15%)
                        </span>
                        <span className="font-bold text-slate-800">
                          {candidate.criteria_breakdown.measurable_outcomes}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Card bottom action */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">
                      ATS Keyword Score: {candidate.ats_score}% (Rank #
                      {candidate.rank_ats})
                    </span>
                    <button
                      type="button"
                      className="font-semibold text-indigo-600 group-hover:text-indigo-700 flex items-center gap-1 text-[11px]"
                    >
                      Inspect Proof & Redaction{" "}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
