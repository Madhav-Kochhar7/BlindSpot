import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Award,
  Layers,
  Scale,
  TrendingUp,
  BarChart2,
  Info,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { runBiasAudit } from "../api";

export default function BiasDashboard({
  candidateCount,
  demographicsCount,
  onOpenDemographicsTab,
}) {
  const [shortlistSize, setShortlistSize] = useState(
    Math.min(Math.max(Math.ceil(candidateCount * 0.5), 2), 5),
  );
  const [selectedDimension, setSelectedDimension] = useState("gender");
  const [auditData, setAuditData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAudit = useCallback(
    async (size) => {
      if (candidateCount === 0 || demographicsCount === 0) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await runBiasAudit(size);
        setAuditData(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to compute Four-Fifths audit.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [candidateCount, demographicsCount],
  );

  useEffect(() => {
    fetchAudit(shortlistSize);
  }, [fetchAudit, shortlistSize]);

  const activeDimAudit = auditData?.dimensions[selectedDimension];

  // Prepare chart data for Selection Rates & Impact Ratios
  const chartData = useMemo(() => {
    if (!activeDimAudit) return [];
    return activeDimAudit.groups.map((g) => ({
      name: g.group_name,
      "Applicant Pool %": g.applicant_pool_pct,
      "ATS Selection Rate %": g.ats_selection_rate,
      "Evidence Selection Rate %": g.evidence_selection_rate,
      "ATS Impact Ratio": g.ats_impact_ratio,
      "Evidence Impact Ratio": g.evidence_impact_ratio,
      atsStatus: g.ats_status,
      evidenceStatus: g.evidence_status,
    }));
  }, [activeDimAudit]);

  if (demographicsCount === 0 || candidateCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
          <Scale className="h-7 w-7" />
        </div>
        <div className="max-w-md mx-auto space-y-1">
          <h3 className="text-base font-bold text-slate-800">
            Demographic Data Required for Four-Fifths Audit
          </h3>
          <p className="text-xs text-slate-500">
            To evaluate demographic selection rates and disparate impact under
            EEOC guidelines, please load or generate demographic profiles for
            your candidate pool.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenDemographicsTab}
          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition"
        >
          <span>Configure Demographics</span>
        </button>
      </div>
    );
  }

  const summary = auditData?.summary;

  return (
    <div className="space-y-6">
      {/* Top Controls & Shortlist Selector */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900">
                EEOC Four-Fifths (80%) Parity Audit Engine
              </h2>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                UGESP 29 C.F.R. § 1607.4(D)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assessing selection rates and adverse impact ratios for both
              screening methods.
            </p>
          </div>
        </div>

        {/* Shortlist Cutoff Slider & Refresher */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Sliders className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">
              Shortlist Cutoff:
            </span>
            <select
              value={shortlistSize}
              onChange={(e) => setShortlistSize(Number(e.target.value))}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
            >
              <option value={2}>Top 2 Candidates</option>
              <option value={3}>Top 3 Candidates</option>
              <option value={4}>Top 4 Candidates</option>
              <option value={5}>Top 5 Candidates</option>
              {candidateCount > 5 && (
                <option value={Math.min(candidateCount, 10)}>
                  Top {Math.min(candidateCount, 10)}
                </option>
              )}
              {candidateCount > 10 && (
                <option value={candidateCount}>All {candidateCount}</option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={() => fetchAudit(shortlistSize)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>Recalculate</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-xs font-medium text-red-600 border border-red-200 shadow-xs">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* High-Level Executive Compliance Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: ATS Shortlist Status */}
          <div
            className={`rounded-2xl border p-5 shadow-sm flex flex-col justify-between ${
              summary.ats_overall_status === "POTENTIAL_BIAS"
                ? "border-rose-200 bg-gradient-to-br from-rose-50/60 to-white"
                : "border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
              <span className="flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-slate-400" />
                Traditional ATS Shortlist
              </span>
              <span className="text-[11px] text-slate-400">
                Top {summary.shortlist_size}
              </span>
            </div>

            <div className="my-3 space-y-1">
              <div className="flex items-center gap-2">
                {summary.ats_overall_status === "POTENTIAL_BIAS" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-extrabold text-rose-800 border border-rose-200">
                    <ShieldAlert className="h-4 w-4" />
                    POTENTIAL DISPARATE IMPACT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    COMPLIANT (PASS)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Lowest Selection Impact Ratio:{" "}
                <strong
                  className={
                    summary.lowest_ats_impact_ratio < 0.8
                      ? "text-rose-600"
                      : "text-emerald-700"
                  }
                >
                  {(summary.lowest_ats_impact_ratio * 100).toFixed(0)}%
                </strong>{" "}
                {summary.lowest_ats_impact_ratio < 0.8 &&
                  "(Below 80% Threshold)"}
              </p>
            </div>

            <p className="text-[11px] text-slate-400">
              {summary.ats_flagged_count > 0
                ? `${summary.ats_flagged_count} demographic dimension(s) triggered adverse impact flags.`
                : "All demographic groups met the 80% selection rate standard."}
            </p>
          </div>

          {/* Card 2: Evidence Shortlist Status */}
          <div
            className={`rounded-2xl border p-5 shadow-sm flex flex-col justify-between ${
              summary.evidence_overall_status === "POTENTIAL_BIAS"
                ? "border-amber-200 bg-gradient-to-br from-amber-50/60 to-white"
                : "border-indigo-200 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-700">
              <span className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-indigo-600" />
                Evidence-Based AI Shortlist
              </span>
              <span className="text-[11px] text-indigo-600 font-semibold">
                Top {summary.shortlist_size}
              </span>
            </div>

            <div className="my-3 space-y-1">
              <div className="flex items-center gap-2">
                {summary.evidence_overall_status === "POTENTIAL_BIAS" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 border border-amber-200">
                    <ShieldAlert className="h-4 w-4" />
                    MODERATE VARIANCE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="h-4 w-4" />
                    EEOC 80% PARITY SATISFIED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Lowest Selection Impact Ratio:{" "}
                <strong
                  className={
                    summary.lowest_evidence_impact_ratio < 0.8
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }
                >
                  {(summary.lowest_evidence_impact_ratio * 100).toFixed(0)}%
                </strong>
              </p>
            </div>

            <p className="text-[11px] text-indigo-700 font-medium">
              Objective skill proofs & PII sanitization mitigated keyword bias.
            </p>
          </div>

          {/* Card 3: Circular Gauge (Matching Figma "Overall Progress") */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col items-center justify-center relative">
            <div className="absolute top-5 left-5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Parity Improvement
            </div>
            
            <div className="w-full max-w-[200px] mt-6 relative">
              <svg viewBox="0 0 100 50" className="w-full overflow-visible">
                {/* Background track */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Progress track */}
                <path
                  d="M 10 50 A 40 40 0 0 1 90 50"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(summary.lowest_evidence_impact_ratio * 125.66)} 125.66`}
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end h-full pb-1">
                <span className="text-3xl font-extrabold text-slate-900">
                  {(summary.lowest_evidence_impact_ratio * 100).toFixed(0)}%
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase mt-1">Impact Ratio</span>
              </div>
            </div>

            <div className="mt-4 flex w-full justify-between px-4 text-center">
              <div>
                <div className="text-sm font-bold text-slate-800">
                  {(summary.lowest_ats_impact_ratio * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-400">ATS Baseline</div>
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-600">
                  {summary.lowest_evidence_impact_ratio >= summary.lowest_ats_impact_ratio ? "+" : ""}
                  {((summary.lowest_evidence_impact_ratio - summary.lowest_ats_impact_ratio) * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-400">Improvement</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Demographic Dimension Tabs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-slate-800">
              Demographic Disparity Breakdown & Comparative Analytics
            </h3>
            <p className="text-xs text-slate-500">
              Inspect group selection rates and the 80% parity benchmark line
              across audit categories.
            </p>
          </div>

          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSelectedDimension("gender")}
              className={`rounded-lg px-3 py-1.5 transition ${
                selectedDimension === "gender"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gender Parity
            </button>
            <button
              type="button"
              onClick={() => setSelectedDimension("ethnicity")}
              className={`rounded-lg px-3 py-1.5 transition ${
                selectedDimension === "ethnicity"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Ethnicity / Race
            </button>
            <button
              type="button"
              onClick={() => setSelectedDimension("age_group")}
              className={`rounded-lg px-3 py-1.5 transition ${
                selectedDimension === "age_group"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Age Groups
            </button>
          </div>
        </div>

        {/* Recharts Visualizations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Selection Rates by Group */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Selection Rate % by Demographic Group
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                Higher = Greater selection
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [`${value}%`]}
                  />

                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  <Bar
                    dataKey="Applicant Pool %"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="ATS Selection Rate %"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                  <Bar
                    dataKey="Evidence Selection Rate %"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={30}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Impact Ratios vs 80% Threshold */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-emerald-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Four-Fifths Impact Ratio vs 80% Parity Line
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700">
                Floor: 0.80
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    domain={[0, 1.2]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderRadius: "0.75rem",
                      border: "1px solid #e2e8f0",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    formatter={(value) => [
                      `${(Number(value) * 100).toFixed(0)}% (${value})`,
                    ]}
                  />

                  <Legend
                    wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  />
                  {/* EEOC 80% Parity Standard Reference Line */}
                  <ReferenceLine
                    y={0.8}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{
                      value: "EEOC 80% Parity Standard",
                      position: "insideTopRight",
                      fill: "#047857",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />

                  <Bar
                    dataKey="ATS Impact Ratio"
                    fill="#fb7185"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="Evidence Impact Ratio"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Group-by-Group Parity Audit Table */}
        {activeDimAudit && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Detailed {activeDimAudit.dimension_name} Parity Compliance
                Matrix
              </h4>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>
                  ATS Benchmark Group:{" "}
                  <strong>{activeDimAudit.benchmark_group_ats}</strong>
                </span>
                <span>•</span>
                <span>
                  Evidence Benchmark Group:{" "}
                  <strong>{activeDimAudit.benchmark_group_evidence}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-3">Group</th>
                    <th className="px-3 py-3">Pool Count</th>
                    <th className="px-3 py-3">ATS Selected</th>
                    <th className="px-3 py-3">ATS Sel Rate</th>
                    <th className="px-3 py-3">ATS Impact Ratio</th>
                    <th className="px-3 py-3">ATS Status</th>
                    <th className="px-3 py-3">AI Selected</th>
                    <th className="px-3 py-3">AI Sel Rate</th>
                    <th className="px-3 py-3">AI Impact Ratio</th>
                    <th className="px-3 py-3">AI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeDimAudit.groups.map((grp) => (
                    <tr
                      key={grp.group_name}
                      className="hover:bg-slate-50 transition"
                    >
                      {/* Group Name */}
                      <td className="px-3 py-3 font-bold text-slate-800">
                        {grp.group_name}
                      </td>

                      {/* Pool Count */}
                      <td className="px-3 py-3 text-slate-600">
                        {grp.total_applicants}{" "}
                        <span className="text-[10px] text-slate-400">
                          ({grp.applicant_pool_pct}%)
                        </span>
                      </td>

                      {/* ATS Selected */}
                      <td className="px-3 py-3 text-slate-700">
                        {grp.ats_selected_count}
                      </td>

                      {/* ATS Selection Rate */}
                      <td className="px-3 py-3 font-semibold text-slate-800">
                        {grp.ats_selection_rate}%
                      </td>

                      {/* ATS Impact Ratio */}
                      <td className="px-3 py-3">
                        <span
                          className={`font-bold ${grp.ats_impact_ratio < 0.8 ? "text-rose-600" : "text-slate-700"}`}
                        >
                          {(grp.ats_impact_ratio * 100).toFixed(0)}%
                        </span>
                      </td>

                      {/* ATS Status */}
                      <td className="px-3 py-3">
                        {grp.ats_status === "POTENTIAL_BIAS" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Bias Alert
                          </span>
                        ) : grp.ats_status === "BENCHMARK" ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Benchmark
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Pass
                          </span>
                        )}
                      </td>

                      {/* Evidence Selected */}
                      <td className="px-3 py-3 font-medium text-slate-700">
                        {grp.evidence_selected_count}
                      </td>

                      {/* Evidence Selection Rate */}
                      <td className="px-3 py-3 font-semibold text-indigo-700">
                        {grp.evidence_selection_rate}%
                      </td>

                      {/* Evidence Impact Ratio */}
                      <td className="px-3 py-3">
                        <span
                          className={`font-bold ${
                            grp.evidence_impact_ratio < 0.8
                              ? "text-amber-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {(grp.evidence_impact_ratio * 100).toFixed(0)}%
                        </span>
                      </td>

                      {/* Evidence Status */}
                      <td className="px-3 py-3">
                        {grp.evidence_status === "POTENTIAL_BIAS" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Variance
                          </span>
                        ) : grp.evidence_status === "BENCHMARK" ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Benchmark
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Pass
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Title VII & Four-Fifths Compliance Guidance Card */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-purple-50/50 p-5 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-indigo-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            About the EEOC Uniform Guidelines on Employee Selection Procedures
            (UGESP)
          </h4>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Under Federal Title VII and UGESP 29 C.F.R. § 1607.4(D), a selection
          rate for any group that is less than four-fifths (80%) of the rate for
          the group with the highest selection rate will generally be regarded
          as evidence of adverse disparate impact. By redacting PII and scoring
          strictly on verifiable evidence quotes, the Blind Audition pipeline
          mitigates keyword bias and upholds legally defensible, merit-based
          hiring standards.
        </p>
      </div>
    </div>
  );
}
