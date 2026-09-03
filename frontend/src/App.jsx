import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Loader2,
  ScanSearch,
  Award,
  Sparkles,
  FileCheck2,
  LayoutGrid,
  Table as TableIcon,
  AlertCircle,
  FileText,
  ShieldCheck,
} from "lucide-react";
import Navigation from "./components/Navigation";
import JobDescriptionInput from "./components/JobDescriptionInput";
import ResumeUploader from "./components/ResumeUploader";
import DualShortlist from "./components/DualShortlist";
import CandidateTable from "./components/CandidateTable";
import EvidenceModal from "./components/EvidenceModal";
import DemographicUploader from "./components/DemographicUploader";
import BiasDashboard from "./components/BiasDashboard";
import HRReviewConsole from "./components/HRReviewConsole";
import ExportReportModal from "./components/ExportReportModal";
import {
  uploadAndScore,
  getDemographicsSummary,
  getHRDecisionsSummary,
  resetSession,
} from "./api";

const SAMPLE_JOB_DESCRIPTION = `Senior Full-Stack Engineer

About the Role:
We are seeking an experienced Full-Stack Engineer to build and scale high-performance web applications. You will be responsible for end-to-end feature development, modern frontend architectures, and resilient backend microservices.

Key Qualifications & Requirements:
- 4+ years of professional experience building web applications using React, TypeScript, and modern JavaScript.
- Strong backend experience with Python (FastAPI / Django) or Node.js.
- Verifiable experience designing RESTful APIs, database schema modeling (PostgreSQL / SQL), and caching strategies (Redis).
- Hands-on experience with Docker, CI/CD pipelines, and cloud deployments (AWS / GCP).
- Track record of delivering measurable outcomes: scaling systems, improving query latencies, or shipping customer-facing features.`;

export default function App() {
  const [jobDescription, setJobDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [jobKeywords, setJobKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 4-Tab Active Navigation
  const [activeTab, setActiveTab] = useState("upload");

  // Shortlist view mode: "dual" | "matrix"
  const [viewMode, setViewMode] = useState("dual");
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Phase 3 & 4 State
  const [demographicSummary, setDemographicSummary] = useState(null);
  const [decisionSummary, setDecisionSummary] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const loadGovernanceData = useCallback(async () => {
    try {
      const [demoSummary, decSummary] = await Promise.all([
        getDemographicsSummary().catch(() => null),
        getHRDecisionsSummary().catch(() => null),
      ]);
      if (demoSummary) setDemographicSummary(demoSummary);
      if (decSummary) setDecisionSummary(decSummary);
    } catch {
      // Offline / uninitialized fallback
    }
  }, []);

  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  const canAnalyze = useMemo(
    () => jobDescription.trim().length > 0 && files.length > 0 && !isLoading,
    [jobDescription, files, isLoading],
  );

  const handleAnalyze = async () => {
    if (!canAnalyze) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await uploadAndScore(jobDescription, files);
      setCandidates(result.candidates);
      setJobKeywords(result.job_keywords);
      await loadGovernanceData();
      setActiveTab("shortlist");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong during analysis.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadSampleJD = () => {
    setJobDescription(SAMPLE_JOB_DESCRIPTION);
  };

  const handleResetDemo = async () => {
    if (
      window.confirm(
        "Are you sure you want to reset all candidate data and session analysis?",
      )
    ) {
      try {
        await resetSession();
        setJobDescription("");
        setFiles([]);
        setCandidates([]);
        setJobKeywords([]);
        setDemographicSummary(null);
        setDecisionSummary(null);
        setSelectedCandidate(null);
        setActiveTab("upload");
      } catch (err) {
        alert("Failed to reset session.");
      }
    }
  };

  const handleDecisionUpdated = (_record) => {
    // Update local decision summary state
    loadGovernanceData();
  };

  // High-level analytics
  const metrics = useMemo(() => {
    if (candidates.length === 0) return null;
    const surges = candidates.filter((c) => c.rank_delta > 0).length;
    const avgEvidence = (
      candidates.reduce((sum, c) => sum + c.evidence_score, 0) /
      candidates.length
    ).toFixed(1);
    const avgAts = (
      candidates.reduce((sum, c) => sum + c.ats_score, 0) / candidates.length
    ).toFixed(1);
    const totalRedactions = candidates.reduce((sum, c) => {
      if (!c.redaction_stats) return sum;
      return (
        sum +
        c.redaction_stats.names +
        c.redaction_stats.institutions +
        c.redaction_stats.dates +
        c.redaction_stats.emails +
        c.redaction_stats.phones
      );
    }, 0);

    return { surges, avgEvidence, avgAts, totalRedactions };
  }, [candidates]);

  // Map of candidate decisions for table view
  const candidateDecisionsMap = useMemo(() => {
    const map = new Map();
    if (decisionSummary) {
      for (const d of decisionSummary.decisions) {
        map.set(d.candidate_identifier, d.decision);
        map.set(d.anonymized_id, d.decision);
      }
    }
    return map;
  }, [decisionSummary]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="h-screen bg-dashboard-bg text-slate-800 flex font-sans overflow-hidden">
      {/* Left Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        candidateCount={
          candidates.length || (demographicSummary?.total_candidates ?? 0)
        }
        demographicsCount={demographicSummary?.total_demographics ?? 0}
        decisionSummary={decisionSummary}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetDemo={handleResetDemo}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main App Content Area */}
      <main className="flex-1 h-full overflow-y-auto px-6 py-8 md:px-10 lg:px-12 space-y-8">
        
        {/* Top Header matching Figma */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === "upload" && "Upload & Configure"}
              {activeTab === "shortlist" && "Dashboard"}
              {activeTab === "audit" && "Bias Analytics"}
              {activeTab === "review" && "HR Review"}
            </h2>
          </div>
          {/* Removed Search and Profile icons as requested */}
        </div>

        {/* ================================================================= */}
        {/* TAB 1: CONFIGURE & UPLOAD */}
        {/* ================================================================= */}
        {activeTab === "upload" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-[#F1EDEE] to-[#F1EDEE] p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600" />
                  <h2 className="text-base font-extrabold text-slate-900">
                    Step 1: Input Job Description & Candidate Resumes
                  </h2>
                </div>
                <p className="text-xs text-slate-600">
                  Upload candidate resumes (.pdf / .docx) from{" "}
                  <code className="bg-white px-1 py-0.5 rounded border">
                    sample_resumes/
                  </code>{" "}
                  to execute dual ATS and Blind AI scoring.
                </p>
              </div>

              {jobDescription.length === 0 && (
                <button
                  type="button"
                  onClick={handleLoadSampleJD}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition"
                >
                  <FileText className="h-4 w-4 text-brand-600" />
                  <span>Autofill Sample Job Description</span>
                </button>
              )}
            </div>

            {/* Input Controls Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-[#F1EDEE] p-6 shadow-sm flex flex-col justify-between">
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                />
                {jobDescription.length === 0 && (
                  <button
                    type="button"
                    onClick={handleLoadSampleJD}
                    className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-800 transition"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Click to fill sample Full-Stack Engineer job description
                    template
                  </button>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#F1EDEE] p-6 shadow-sm">
                <ResumeUploader files={files} onFilesChange={setFiles} />
              </div>
            </div>

            {/* Action Button & Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#F1EDEE] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:from-brand-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanSearch className="h-4 w-4" />
                  )}
                  {isLoading
                    ? "Running Blind Audit & AI Scorer..."
                    : "Run Dual-Pipeline Analysis"}
                </button>

                <span className="text-xs text-slate-500 font-medium">
                  {files.length === 0
                    ? "Upload at least 1 resume to begin."
                    : `${files.length} resume${files.length > 1 ? "s" : ""} selected for evaluation.`}
                </span>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: DUAL SHORTLIST & CANDIDATE EVIDENCE */}
        {/* ================================================================= */}
        {activeTab === "shortlist" && (
          <div className="space-y-6">
            {/* Extracted Keywords Bar */}
            {jobKeywords.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Job Requirement Target Keywords ({jobKeywords.length})
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    Extracted for ATS benchmark comparison
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {jobKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metrics Overview Bar */}
            {metrics && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-3xl border border-transparent bg-dashboard-card p-6 shadow-sm flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <FileCheck2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 mb-1">Evaluated Resumes</div>
                    <div className="text-3xl font-extrabold text-slate-900">{candidates.length}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-transparent bg-dashboard-card p-6 shadow-sm flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-full bg-orange-100 text-brand-500 flex items-center justify-center">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 mb-1">Evidence Surges</div>
                    <div className="text-3xl font-extrabold text-slate-900">{metrics.surges}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-transparent bg-dashboard-card p-6 shadow-sm flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 mb-1">Avg Score</div>
                    <div className="text-3xl font-extrabold text-slate-900">{metrics.avgEvidence}%</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-transparent bg-dashboard-card p-6 shadow-sm flex flex-col gap-4">
                  <div className="h-12 w-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-500 mb-1">PII Scrubbed</div>
                    <div className="text-3xl font-extrabold text-slate-900">{metrics.totalRedactions}</div>
                  </div>
                </div>
              </div>
            )}

            {candidates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                <p className="text-sm text-slate-500">
                  No candidate resumes analyzed yet.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("upload")}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <span>Go to Upload & Configure</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* View Switcher Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Candidate Shortlist & Evidence Comparison (
                      {candidates.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click on any candidate to inspect verified resume quotes
                      and the sanitized Blind Audition document.
                    </p>
                  </div>

                  <div className="inline-flex rounded-xl bg-slate-200/80 p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setViewMode("dual")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                        viewMode === "dual"
                          ? "bg-white text-brand-700 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                      Dual Shortlist View
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("matrix")}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                        viewMode === "matrix"
                          ? "bg-white text-brand-700 shadow-xs font-bold"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                      Comparison Matrix View
                    </button>
                  </div>
                </div>

                {viewMode === "dual" ? (
                  <DualShortlist
                    candidates={candidates}
                    onSelectCandidate={setSelectedCandidate}
                    onViewBiasAudit={() => setActiveTab("audit")}
                  />
                ) : (
                  <CandidateTable
                    candidates={candidates}
                    onSelectCandidate={setSelectedCandidate}
                    decisionsMap={candidateDecisionsMap}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 3: BIAS ANALYTICS & EEOC PARITY AUDIT */}
        {/* ================================================================= */}
        {activeTab === "audit" && (
          <div className="space-y-8">
            <DemographicUploader
              summary={demographicSummary}
              onDemographicsUpdated={setDemographicSummary}
              candidateCount={
                candidates.length || (demographicSummary?.total_candidates ?? 0)
              }
            />

            <BiasDashboard
              candidateCount={
                candidates.length || (demographicSummary?.total_candidates ?? 0)
              }
              demographicsCount={demographicSummary?.total_demographics ?? 0}
              onOpenDemographicsTab={() => setActiveTab("audit")}
            />
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 4: HR REVIEW & FINAL DECISIONS */}
        {/* ================================================================= */}
        {activeTab === "review" && (
          <div className="space-y-6">
            <HRReviewConsole
              candidates={candidates}
              decisionSummary={decisionSummary}
              onDecisionUpdated={handleDecisionUpdated}
              onSelectCandidateForInspection={setSelectedCandidate}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Deep-Dive Evidence & Redaction Inspector Modal */}
      <EvidenceModal
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />

      {/* Compliance Audit Report Export Modal */}
      <ExportReportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}
