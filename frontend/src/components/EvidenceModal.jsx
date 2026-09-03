import { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Eye,
  EyeOff,
  Sparkles,
  Quote,
  Layers,
  BarChart3,
  Copy,
  Check,
  Github,
} from "lucide-react";

function getConfidenceBadge(confidence) {
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Verified Proof ({(confidence * 100).toFixed(0)}%)
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
        <Sparkles className="h-3 w-3" />
        Moderate Evidence ({(confidence * 100).toFixed(0)}%)
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
      <AlertCircle className="h-3 w-3" />
      Unverified / Claim Only
    </span>
  );
}

function getScoreColor(score) {
  if (score >= 75) {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
    };
  }
  if (score >= 50) {
    return {
      badge: "bg-blue-50 text-blue-700 border-blue-200",
      bar: "bg-blue-500",
      text: "text-blue-700",
    };
  }
  if (score >= 35) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      bar: "bg-amber-500",
      text: "text-amber-700",
    };
  }
  return {
    badge: "bg-rose-50 text-rose-700 border-rose-200",
    bar: "bg-rose-500",
    text: "text-rose-700",
  };
}

export default function EvidenceModal({ candidate, onClose }) {
  const [activeTab, setActiveTab] = useState("provenance");
  const [revealIdentity, setRevealIdentity] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!candidate) return null;

  const cb = candidate.criteria_breakdown;

  // Formatter to highlight [REDACTED_*] tokens in the redacted resume
  const renderRedactedText = (text) => {
    if (!text)
      return (
        <p className="text-slate-400 italic">No redacted text available.</p>
      );

    const parts = text.split(/(\[REDACTED_[A-Z]+\])/g);
    return (
      <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700 select-text">
        {parts.map((part, i) => {
          if (part.startsWith("[REDACTED_") && part.endsWith("]")) {
            return (
              <span
                key={i}
                className="inline-block rounded px-1.5 py-0.5 mx-0.5 font-semibold text-[11px] bg-purple-100 text-purple-800 border border-purple-200 shadow-sm"
              >
                {part}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 border border-brand-100 text-brand-600 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-800">
                  {revealIdentity
                    ? candidate.candidate_name
                    : candidate.anonymized_id}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-100">
                  <ShieldCheck className="h-3 w-3" />
                  Blind Audition
                </span>
                {candidate.is_mock && (
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Heuristic Engine
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {revealIdentity
                  ? candidate.filename
                  : "PII Redacted & Blind Assessed"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Reveal Identity Toggle */}
            <button
              type="button"
              onClick={() => setRevealIdentity(!revealIdentity)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              title="Toggle reveal original name for post-audit"
            >
              {revealIdentity ? (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                  Hide Name
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  Reveal Name
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Scroll Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* GitHub Verification Banner */}
          {candidate.criteria_breakdown?.open_source_portfolio !== undefined && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 text-white shadow-sm">
              <Github className="h-5 w-5 text-slate-300" />
              <div className="flex-1">
                <p className="text-sm font-semibold">GitHub Verification Active</p>
                <p className="text-xs text-slate-400">
                  Open-source portfolio links were extracted, fetched via API, and cross-referenced by the LLM.
                </p>
              </div>
            </div>
          )}

          {/* Top Score Comparison Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Evidence Score Card */}
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-brand-50/50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 uppercase tracking-wide">
                <span>Evidence AI Score</span>
                <Award className="h-4 w-4 text-brand-600" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">
                  {candidate.evidence_score}%
                </span>
                <span className="text-xs font-medium text-indigo-600">
                  Rank #{candidate.rank_evidence}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Weighted proof score across 4 competencies
              </p>
            </div>

            {/* Traditional ATS Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>Traditional ATS Score</span>
                <Layers className="h-4 w-4 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-700">
                  {candidate.ats_score}%
                </span>
                <span className="text-xs font-medium text-slate-500">
                  Rank #{candidate.rank_ats}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {candidate.matched_keywords.length}/{candidate.total_keywords}{" "}
                raw keywords matched
              </p>
            </div>

            {/* Rank Shift & Audition Impact */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>Blind Audition Delta</span>
                <TrendingUp
                  className={`h-4 w-4 ${
                    candidate.rank_delta > 0
                      ? "text-emerald-500"
                      : candidate.rank_delta < 0
                        ? "text-rose-500"
                        : "text-slate-400"
                  }`}
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                {candidate.rank_delta > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                    ▲ +{candidate.rank_delta} Ranks Higher
                  </span>
                ) : candidate.rank_delta < 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-sm font-bold text-rose-800">
                    ▼ {candidate.rank_delta} Ranks Lower
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                    = Neutral Rank
                  </span>
                )}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {candidate.rank_delta > 0
                  ? "Discovered: high verifiable proof despite lower keyword density."
                  : candidate.rank_delta < 0
                    ? "Adjusted: high keyword frequency lacked tangible proof quotes."
                    : "Consistent ranking across both keyword and proof metrics."}
              </p>
            </div>
          </div>

          {/* AI Written Rationale Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-brand-600" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                AI Evaluation Rationale
              </h4>
            </div>
            <p className="text-sm leading-relaxed text-slate-700">
              {candidate.rationale || "No rationale provided."}
            </p>
          </div>

          {/* 4-Criteria Weighted Breakdown */}
          {cb && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-brand-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-700">
                    Weighted Criteria Breakdown
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-medium">
                  Standardized 0-100 Scale
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Technical Skills */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Technical Skills (40% wt)</span>
                    <span className="font-bold text-slate-900">
                      {cb.technical_skills}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getScoreColor(cb.technical_skills).bar
                      }`}
                      style={{
                        width: `${Math.min(cb.technical_skills, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 2. Project Experience */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Project Experience (25% wt)</span>
                    <span className="font-bold text-slate-900">
                      {cb.project_experience}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getScoreColor(cb.project_experience).bar
                      }`}
                      style={{
                        width: `${Math.min(cb.project_experience, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 3. Domain Experience */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Domain & Work Context (20% wt)</span>
                    <span className="font-bold text-slate-900">
                      {cb.domain_experience}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getScoreColor(cb.domain_experience).bar
                      }`}
                      style={{
                        width: `${Math.min(cb.domain_experience, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 4. Measurable Outcomes */}
                <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Measurable Outcomes (15% wt)</span>
                    <span className="font-bold text-slate-900">
                      {cb.measurable_outcomes}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        getScoreColor(cb.measurable_outcomes).bar
                      }`}
                      style={{
                        width: `${Math.min(cb.measurable_outcomes, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 5. Open Source Portfolio */}
                {cb.open_source_portfolio !== undefined && (
                  <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>Open Source Portfolio (15% wt)</span>
                      <span className="font-bold text-slate-900">
                        {cb.open_source_portfolio}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          getScoreColor(cb.open_source_portfolio).bar
                        }`}
                        style={{
                          width: `${Math.min(cb.open_source_portfolio, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab("provenance")}
                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === "provenance"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <Quote className="h-4 w-4" />
                Verified Evidence Quotes ({candidate.extracted_evidence.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("redacted")}
                className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition ${
                  activeTab === "redacted"
                    ? "border-brand-600 text-brand-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <FileText className="h-4 w-4" />
                Blind Redacted Resume
              </button>
            </nav>
          </div>

          {/* Tab 1: Verifiable Provenance Quotes */}
          {activeTab === "provenance" && (
            <div className="space-y-3">
              {candidate.extracted_evidence.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  No extracted skill evidence records found.
                </div>
              ) : (
                candidate.extracted_evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {item.skill}
                        </span>
                      </div>
                      {getConfidenceBadge(item.confidence)}
                    </div>

                    <div className="relative rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-700 italic">
                      <Quote className="h-3 w-3 absolute top-2 left-2 text-slate-300 pointer-events-none" />
                      <p className="pl-4">{item.evidence_quote}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab 2: Blind Redacted Resume */}
          {activeTab === "redacted" && (
            <div className="space-y-4">
              {/* Redaction stats summary pills */}
              {candidate.redaction_stats && (
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-purple-50 border border-purple-100 text-xs text-purple-900">
                  <span className="font-bold">Sanitized PII Entities:</span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium border border-purple-200">
                    Names: {candidate.redaction_stats.names}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium border border-purple-200">
                    Institutions: {candidate.redaction_stats.institutions}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium border border-purple-200">
                    Dates/Years: {candidate.redaction_stats.dates}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium border border-purple-200">
                    Emails: {candidate.redaction_stats.emails}
                  </span>
                  <span className="rounded bg-white px-2 py-0.5 font-medium border border-purple-200">
                    Phones: {candidate.redaction_stats.phones}
                  </span>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-96 overflow-y-auto">
                {renderRedactedText(candidate.redacted_text)}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-4 w-4 text-brand-600" />
            <span>
              Blind evaluation safeguards hiring decisions from demographic &
              prestige bias.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-700 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
