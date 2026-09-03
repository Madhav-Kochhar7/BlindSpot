"""
main.py

FastAPI backend for the Bias-Aware Resume Screener (Phase 4 - Production Ready).

Architecture:
- Pipeline A: Raw Text -> Keyword ATS Scorer -> Traditional ATS Match Score
- Pipeline B: Raw Text -> PII Redaction -> Evidence Extraction & Scoring Agent
              -> Verifiable Evidence Quotes, Criteria Breakdown, & Blind AI Score
- Data Isolation: SQLite storage strictly separating candidate evaluation from demographics.
- Governance & Compliance: EEOC Four-Fifths (80%) Parity Rule Audit Engine.
- Human-in-the-Loop Oversight: Decision state persistence, override logging, and compliance export.
"""

from __future__ import annotations

import asyncio
import csv
import io
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, File, Form, HTTPException, Query, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ats_scorer import extract_keywords, score_resume
from bias_audit import (
    BiasAuditResponse,
    generate_demo_demographics,
    run_bias_audit,
)
from database import (
    get_all_candidates_evaluation,
    get_demographics_summary,
    init_db,
    save_candidate_evaluations,
    save_demographics,
)
from evidence_extractor import (
    CriteriaBreakdown,
    ExtractedEvidenceItem,
    extract_and_score_evidence,
)
from hr_review import (
    HRDecisionInput,
    HRDecisionRecord,
    HRDecisionSummary,
    generate_audit_report_csv,
    generate_audit_report_data,
    generate_audit_report_pdf,
    get_hr_decisions_summary,
    init_hr_tables,
    reset_database,
    save_hr_decision,
)
from redaction import redact_resume
from resume_parser import (
    ResumeParsingError,
    UnsupportedFileTypeError,
    extract_text,
)

# Initialize database tables on module load
init_db()
init_hr_tables()

app = FastAPI(
    title="Bias-Aware Resume Screener API",
    description="Phase 4: Blind Audition, Evidence AI Scoring, EEOC Four-Fifths Parity Audit & HR Governance.",
    version="0.4.0",
)

# Allow all origins for production deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CandidateResult(BaseModel):
    filename: str
    candidate_name: str
    anonymized_id: str
    word_count: int
    score: float  # Legacy alias for ats_score
    ats_score: float
    evidence_score: float
    matched_keywords: List[str]
    total_keywords: int
    rationale: str
    criteria_breakdown: Optional[CriteriaBreakdown] = None
    extracted_evidence: List[ExtractedEvidenceItem] = []
    redacted_text: Optional[str] = None
    redaction_stats: Optional[Dict[str, int]] = None
    rank_ats: int = 1
    rank_evidence: int = 1
    rank_delta: int = 0  # (rank_ats - rank_evidence): positive means surge under evidence scoring
    decision: str = "PENDING"
    is_mock: bool = False
    error: Optional[str] = None


class UploadResponse(BaseModel):
    job_keywords: List[str]
    candidates: List[CandidateResult]
    total_resumes: int
    mode: str = "phase4"


class AuditRequest(BaseModel):
    shortlist_size: int = Field(5, ge=1, le=100)


# In-memory storage for active session results
LAST_RESULT: Optional[UploadResponse] = None


def _derive_candidate_name(filename: str) -> str:
    """Turn 'jane_doe_resume.pdf' into 'Jane Doe'."""
    stem = filename.rsplit(".", 1)[0]
    cleaned = stem.replace("_", " ").replace("-", " ").strip()
    cleaned = " ".join([w for w in cleaned.split() if w.lower() not in {"resume", "cv"}])
    return cleaned.title() if cleaned else filename


async def _process_single_resume(
    index: int,
    filename: str,
    file_bytes: bytes,
    job_description: str,
    job_keywords: List[str],
) -> CandidateResult:
    """Process a single resume through both Pipeline A and Pipeline B."""
    candidate_name = _derive_candidate_name(filename)

    try:
        raw_text = extract_text(filename, file_bytes)
    except (UnsupportedFileTypeError, ResumeParsingError) as exc:
        anonymized_id = f"Candidate C-{index:03d}"
        return CandidateResult(
            filename=filename,
            candidate_name=candidate_name,
            anonymized_id=anonymized_id,
            word_count=0,
            score=0.0,
            ats_score=0.0,
            evidence_score=0.0,
            matched_keywords=[],
            total_keywords=len(job_keywords),
            rationale="File parsing failed.",
            criteria_breakdown=None,
            extracted_evidence=[],
            redacted_text=None,
            redaction_stats=None,
            rank_ats=999,
            rank_evidence=999,
            rank_delta=0,
            decision="PENDING",
            error=str(exc),
        )

    # Pipeline A: Keyword ATS Scoring
    ats_score, matched = score_resume(raw_text, job_keywords)

    # Pipeline B - Step 1: PII Redaction for Blind Audition
    anonymized_id, redacted_text, redaction_stats = redact_resume(
        resume_text=raw_text,
        candidate_index=index,
        candidate_name=candidate_name,
    )

    # Pipeline B - Step 2: Evidence Extraction & AI Scoring
    evidence_res = await extract_and_score_evidence(
        redacted_resume=redacted_text,
        job_description=job_description,
        candidate_id=anonymized_id,
    )

    return CandidateResult(
        filename=filename,
        candidate_name=candidate_name,
        anonymized_id=anonymized_id,
        word_count=len(raw_text.split()),
        score=ats_score,
        ats_score=ats_score,
        evidence_score=evidence_res.evidence_score,
        matched_keywords=matched,
        total_keywords=len(job_keywords),
        rationale=evidence_res.rationale,
        criteria_breakdown=evidence_res.criteria_breakdown,
        extracted_evidence=evidence_res.extracted_evidence,
        redacted_text=redacted_text,
        redaction_stats=redaction_stats,
        decision="PENDING",
        is_mock=evidence_res.is_mock,
    )


# System & Results Endpoints


@app.get("/api/health")
async def health_check() -> dict:
    return {"status": "ok", "phase": 4}


@app.get("/api/results", response_model=Optional[UploadResponse])
async def get_last_results():
    """Return the most recent analysis, if any has been run this session."""
    return LAST_RESULT


@app.post("/api/upload-and-score", response_model=UploadResponse)
async def upload_and_score(
    job_description: str = Form(...),
    resumes: List[UploadFile] = File(...),
) -> UploadResponse:
    global LAST_RESULT

    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    if not resumes:
        raise HTTPException(status_code=400, detail="At least one resume file is required.")

    job_keywords = extract_keywords(job_description)

    file_payloads: List[tuple[str, bytes]] = []
    for upload in resumes:
        filename = upload.filename or "unnamed_file"
        file_bytes = await upload.read()
        file_payloads.append((filename, file_bytes))

    # Process all resumes concurrently across both pipelines
    tasks = [
        _process_single_resume(
            index=i + 1,
            filename=fname,
            file_bytes=fbytes,
            job_description=job_description,
            job_keywords=job_keywords,
        )
        for i, (fname, fbytes) in enumerate(file_payloads)
    ]

    candidate_results: List[CandidateResult] = await asyncio.gather(*tasks)

    # Compute ATS Rankings
    sorted_by_ats = sorted(
        enumerate(candidate_results),
        key=lambda item: (item[1].ats_score if item[1].error is None else -1),
        reverse=True,
    )
    for rank, (orig_idx, _) in enumerate(sorted_by_ats, start=1):
        candidate_results[orig_idx].rank_ats = rank

    # Compute Evidence Rankings
    sorted_by_evidence = sorted(
        enumerate(candidate_results),
        key=lambda item: (item[1].evidence_score if item[1].error is None else -1),
        reverse=True,
    )
    for rank, (orig_idx, _) in enumerate(sorted_by_evidence, start=1):
        candidate_results[orig_idx].rank_evidence = rank

    # Compute rank deltas: (rank_ats - rank_evidence)
    for cand in candidate_results:
        if cand.error:
            cand.rank_delta = 0
        else:
            cand.rank_delta = cand.rank_ats - cand.rank_evidence

    # Sort default candidates by Evidence Score descending
    candidate_results.sort(key=lambda c: (c.evidence_score if c.error is None else -1), reverse=True)

    # Persist evaluations into isolated database
    save_candidate_evaluations([c.dict() for c in candidate_results if not c.error])

    result = UploadResponse(
        job_keywords=job_keywords,
        candidates=candidate_results,
        total_resumes=len(candidate_results),
        mode="phase4",
    )
    LAST_RESULT = result
    return result


# Demographic Management & Governance Endpoints


@app.get("/api/demographics")
async def get_demographics() -> dict:
    """Retrieve demographic distribution summary from isolated storage."""
    return get_demographics_summary()


@app.post("/api/demographics/upload")
async def upload_demographics(
    file: Optional[UploadFile] = File(None),
    generate_demo: bool = Form(False),
) -> dict:
    """
    Ingest demographic attributes via CSV or auto-generate balanced test dataset.
    Strictly isolated from candidate evaluation tables.
    """
    global LAST_RESULT

    if generate_demo:
        candidates = []
        if LAST_RESULT and LAST_RESULT.candidates:
            candidates = [c.dict() for c in LAST_RESULT.candidates]
        else:
            candidates = get_all_candidates_evaluation()

        if not candidates:
            raise HTTPException(
                status_code=400,
                detail="No candidates found in session or database. Upload resumes first to generate demo demographics.",
            )

        count = generate_demo_demographics(candidates)
        summary = get_demographics_summary()
        return {
            "status": "success",
            "message": f"Generated demographic records for {count} candidates.",
            "summary": summary,
        }

    if not file:
        raise HTTPException(status_code=400, detail="CSV file or generate_demo=true is required.")

    file_bytes = await file.read()
    content_str = file_bytes.decode("utf-8-sig", errors="replace")

    records: List[Dict[str, str]] = []
    reader = csv.DictReader(io.StringIO(content_str))

    for row in reader:
        norm_row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        identifier = (
            norm_row.get("candidate_id")
            or norm_row.get("filename")
            or norm_row.get("anonymized_id")
            or norm_row.get("id")
        )
        if not identifier:
            continue

        records.append({
            "candidate_id": identifier,
            "anonymized_id": norm_row.get("anonymized_id") or identifier,
            "gender": norm_row.get("gender", "Unspecified"),
            "ethnicity": norm_row.get("ethnicity", "Unspecified"),
            "age_group": norm_row.get("age_group", norm_row.get("age", "Unspecified")),
        })

    if not records:
        raise HTTPException(
            status_code=400,
            detail="No valid demographic records found in CSV. Expected headers: candidate_id, gender, ethnicity, age_group",
        )

    count = save_demographics(records)
    summary = get_demographics_summary()
    return {
        "status": "success",
        "message": f"Successfully ingested {count} demographic records.",
        "summary": summary,
    }


@app.post("/api/audit/run", response_model=BiasAuditResponse)
async def run_audit_post(
    request: AuditRequest = Body(default_factory=AuditRequest),
) -> BiasAuditResponse:
    """Run EEOC Four-Fifths Rule compliance audit for the top N shortlist."""
    return run_bias_audit(shortlist_size=request.shortlist_size)


@app.get("/api/audit/run", response_model=BiasAuditResponse)
async def run_audit_get(
    shortlist_size: int = Query(5, ge=1, le=100),
) -> BiasAuditResponse:
    """Run EEOC Four-Fifths Rule audit via GET query parameter."""
    return run_bias_audit(shortlist_size=shortlist_size)


# Phase 4: Human-in-the-Loop HR Governance & Decision Endpoints


@app.post("/api/decisions", response_model=HRDecisionRecord)
async def submit_decision(decision_input: HRDecisionInput) -> HRDecisionRecord:
    """
    Save or update an HR review decision with override justification and append to audit log.
    """
    try:
        record = save_hr_decision(
            candidate_identifier=decision_input.candidate_id,
            decision=decision_input.decision,
            override_reason=decision_input.override_reason,
            reviewer_name=decision_input.reviewer_name,
        )
        return record
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.get("/api/decisions/summary", response_model=HRDecisionSummary)
async def get_decisions_summary() -> HRDecisionSummary:
    """Retrieve all candidate review states, decision counts, and completion metrics."""
    return get_hr_decisions_summary()


@app.get("/api/export/audit-report")
async def export_audit_report(format: str = Query("json", regex="^(json|csv|pdf)$")) -> Any:
    """
    Download complete compliance audit report in JSON, CSV, or PDF format.
    """
    if format == "csv":
        csv_content = generate_audit_report_csv()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=eeoc_compliance_audit_report.csv"},
        )
    elif format == "pdf":
        pdf_content = generate_audit_report_pdf()
        return Response(
            content=pdf_content,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=eeoc_compliance_audit_report.pdf"},
        )

    return generate_audit_report_data()


@app.post("/api/reset")
async def reset_session() -> dict:
    """Reset all session analysis, stored candidates, demographics, and decisions."""
    global LAST_RESULT
    LAST_RESULT = None
    reset_database()
    return {"status": "success", "message": "Demo session data and database reset successfully."}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
