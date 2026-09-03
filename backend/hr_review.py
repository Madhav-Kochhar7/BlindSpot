"""
hr_review.py

Human-in-the-Loop HR Governance & Decision Audit Logging for Bias-Aware Resume Screener.

Ensures:
1. No automated rejections - Human oversight is always the final authority.
2. Decision state tracking: PENDING, APPROVED, REJECTED, FLAGGED_FOR_INTERVIEW.
3. Override tracking with required human justification notes.
4. Immutable append-only audit log for compliance recordkeeping.
5. Exportable compliance audit summary reports (JSON & CSV).
"""

from __future__ import annotations

import csv
import io
import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from bias_audit import run_bias_audit
from database import DB_PATH, get_all_candidates_evaluation, get_db_connection


VALID_DECISIONS = {"PENDING", "APPROVED", "REJECTED", "FLAGGED_FOR_INTERVIEW"}


class HRDecisionInput(BaseModel):
    candidate_id: str = Field(..., description="Candidate filename or anonymized identifier.")
    decision: str = Field(..., description="APPROVED | REJECTED | FLAGGED_FOR_INTERVIEW | PENDING")
    override_reason: Optional[str] = Field(None, description="Justification note when overriding scores or making final calls.")
    reviewer_name: str = Field("HR Reviewer", description="Name/ID of reviewer.")


class HRDecisionRecord(BaseModel):
    candidate_identifier: str
    anonymized_id: str
    candidate_name: str
    decision: str
    override_reason: Optional[str] = None
    reviewer_name: str
    ats_score: float
    evidence_score: float
    rank_ats: int = 1
    rank_evidence: int = 1
    updated_at: str


class HRDecisionSummary(BaseModel):
    total_candidates: int
    reviewed_count: int
    pending_count: int
    approved_count: int
    rejected_count: int
    flagged_count: int
    completion_percentage: float
    decisions: List[HRDecisionRecord]


def init_hr_tables() -> None:
    """Initialize HR decisions and audit log tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table 1: Current HR Decision State per candidate
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS hr_decisions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_identifier TEXT UNIQUE NOT NULL,
            anonymized_id TEXT NOT NULL,
            decision TEXT NOT NULL DEFAULT 'PENDING',
            override_reason TEXT,
            reviewer_name TEXT NOT NULL DEFAULT 'HR Reviewer',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Table 2: Immutable Append-Only Audit Trail
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            candidate_identifier TEXT NOT NULL,
            anonymized_id TEXT NOT NULL,
            action TEXT NOT NULL, -- 'DECISION_UPDATED' | 'OVERRIDE_RECORDED' | 'AUDIT_EXPORTED'
            decision TEXT NOT NULL,
            override_reason TEXT,
            reviewer_name TEXT NOT NULL,
            ats_score REAL,
            evidence_score REAL,
            parity_status TEXT
        )
        """
    )

    conn.commit()
    conn.close()


def save_hr_decision(
    candidate_identifier: str,
    decision: str,
    override_reason: Optional[str] = None,
    reviewer_name: str = "HR Reviewer",
) -> HRDecisionRecord:
    """
    Save or update an HR review decision and append to the immutable audit trail.
    """
    init_hr_tables()
    dec_upper = decision.strip().upper()
    if dec_upper not in VALID_DECISIONS:
        raise ValueError(f"Invalid decision '{decision}'. Must be one of: {VALID_DECISIONS}")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Look up candidate details
    cursor.execute(
        "SELECT * FROM candidates WHERE filename = ? OR anonymized_id = ?",
        (candidate_identifier, candidate_identifier),
    )
    cand_row = cursor.fetchone()

    anonymized_id = cand_row["anonymized_id"] if cand_row else candidate_identifier
    candidate_name = cand_row["candidate_name"] if cand_row else candidate_identifier
    ats_score = cand_row["ats_score"] if cand_row else 0.0
    evidence_score = cand_row["evidence_score"] if cand_row else 0.0

    # Upsert current state
    cursor.execute(
        """
        INSERT INTO hr_decisions (
            candidate_identifier, anonymized_id, decision, override_reason, reviewer_name, updated_at
        ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(candidate_identifier) DO UPDATE SET
            anonymized_id = excluded.anonymized_id,
            decision = excluded.decision,
            override_reason = excluded.override_reason,
            reviewer_name = excluded.reviewer_name,
            updated_at = CURRENT_TIMESTAMP
        """,
        (candidate_identifier, anonymized_id, dec_upper, override_reason, reviewer_name),
    )

    # Append to immutable audit trail
    action = "OVERRIDE_RECORDED" if override_reason and override_reason.strip() else "DECISION_UPDATED"
    cursor.execute(
        """
        INSERT INTO audit_log (
            candidate_identifier, anonymized_id, action, decision,
            override_reason, reviewer_name, ats_score, evidence_score, parity_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            candidate_identifier,
            anonymized_id,
            action,
            dec_upper,
            override_reason,
            reviewer_name,
            ats_score,
            evidence_score,
            "EEOC_AUDITED",
        ),
    )

    conn.commit()
    conn.close()

    return HRDecisionRecord(
        candidate_identifier=candidate_identifier,
        anonymized_id=anonymized_id,
        candidate_name=candidate_name,
        decision=dec_upper,
        override_reason=override_reason,
        reviewer_name=reviewer_name,
        ats_score=ats_score,
        evidence_score=evidence_score,
        updated_at=datetime.utcnow().isoformat(),
    )


def get_hr_decisions_summary() -> HRDecisionSummary:
    """
    Retrieve all candidate evaluation records joined with their current HR review state.
    """
    init_hr_tables()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT 
            c.filename as candidate_identifier,
            c.anonymized_id,
            c.candidate_name,
            COALESCE(h.decision, 'PENDING') as decision,
            h.override_reason,
            COALESCE(h.reviewer_name, 'Unassigned') as reviewer_name,
            c.ats_score,
            c.evidence_score,
            COALESCE(h.updated_at, c.created_at) as updated_at
        FROM candidates c
        LEFT JOIN hr_decisions h 
            ON c.filename = h.candidate_identifier 
            OR c.anonymized_id = h.candidate_identifier
        ORDER BY c.evidence_score DESC
        """
    )
    rows = cursor.fetchall()
    conn.close()

    decisions: List[HRDecisionRecord] = []
    approved = 0
    rejected = 0
    flagged = 0
    pending = 0

    for r in rows:
        d_val = r["decision"].upper()
        if d_val == "APPROVED":
            approved += 1
        elif d_val == "REJECTED":
            rejected += 1
        elif d_val == "FLAGGED_FOR_INTERVIEW":
            flagged += 1
        else:
            pending += 1

        decisions.append(
            HRDecisionRecord(
                candidate_identifier=r["candidate_identifier"],
                anonymized_id=r["anonymized_id"],
                candidate_name=r["candidate_name"],
                decision=d_val,
                override_reason=r["override_reason"],
                reviewer_name=r["reviewer_name"],
                ats_score=float(r["ats_score"] or 0.0),
                evidence_score=float(r["evidence_score"] or 0.0),
                updated_at=str(r["updated_at"]),
            )
        )

    total = len(decisions)
    reviewed = approved + rejected + flagged
    completion = round((reviewed / max(total, 1)) * 100.0, 1)

    return HRDecisionSummary(
        total_candidates=total,
        reviewed_count=reviewed,
        pending_count=pending,
        approved_count=approved,
        rejected_count=rejected,
        flagged_count=flagged,
        completion_percentage=completion,
        decisions=decisions,
    )


def generate_audit_report_data() -> Dict[str, Any]:
    """
    Compile a full compliance audit summary report combining:
    - Overall hiring audit summary
    - EEOC Four-Fifths compliance audit results
    - Candidate evaluations, AI scores, human decisions, and override justifications
    """
    decisions_summary = get_hr_decisions_summary()
    audit_data = run_bias_audit(shortlist_size=max(decisions_summary.approved_count, 5))

    return {
        "report_id": f"AUDIT-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        "generated_at": datetime.utcnow().isoformat(),
        "compliance_standard": "EEOC Uniform Guidelines on Employee Selection Procedures (29 C.F.R. § 1607)",
        "summary": {
            "total_applicants": decisions_summary.total_candidates,
            "reviewed_candidates": decisions_summary.reviewed_count,
            "approved_candidates": decisions_summary.approved_count,
            "flagged_for_interview": decisions_summary.flagged_count,
            "rejected_candidates": decisions_summary.rejected_count,
            "pending_candidates": decisions_summary.pending_count,
            "eeoc_four_fifths_parity_status": audit_data.summary.evidence_overall_status,
            "lowest_parity_impact_ratio": f"{int(audit_data.summary.lowest_evidence_impact_ratio * 100)}%",
            "parity_improvement_note": audit_data.summary.parity_improvement_summary,
        },
        "four_fifths_audit": audit_data.dict(),
        "candidate_decisions": [d.dict() for d in decisions_summary.decisions],
    }


def generate_audit_report_csv() -> str:
    """Export the candidate decisions and score comparison as a CSV document."""
    report_data = generate_audit_report_data()
    candidates = report_data.get("candidate_decisions", [])

    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["=== BIAS-AWARE RESUME SCREENER - COMPLIANCE AUDIT REPORT ==="])
    writer.writerow(["Report ID", report_data.get("report_id")])
    writer.writerow(["Generated At", report_data.get("generated_at")])
    writer.writerow(["EEOC Parity Status", report_data["summary"]["eeoc_four_fifths_parity_status"]])
    writer.writerow(["Lowest Impact Ratio", report_data["summary"]["lowest_parity_impact_ratio"]])
    writer.writerow([])

    # Table Header
    writer.writerow([
        "Anonymized ID",
        "Candidate Name",
        "Filename",
        "Evidence AI Score (%)",
        "ATS Keyword Score (%)",
        "HR Decision",
        "Override Reason / Justification",
        "Reviewer",
        "Decision Timestamp",
    ])

    for c in candidates:
        writer.writerow([
            c.get("anonymized_id", ""),
            c.get("candidate_name", ""),
            c.get("candidate_identifier", ""),
            f"{c.get('evidence_score', 0.0)}%",
            f"{c.get('ats_score', 0.0)}%",
            c.get("decision", "PENDING"),
            c.get("override_reason") or "N/A",
            c.get("reviewer_name", "HR Reviewer"),
            c.get("updated_at", ""),
        ])

    return output.getvalue()


def generate_audit_report_pdf() -> bytes:
    """Export the candidate decisions and score comparison as a PDF document."""
    report_data = generate_audit_report_data()
    candidates = report_data.get("candidate_decisions", [])

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(letter),
        rightMargin=30,
        leftMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    elements = []

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    normal_style = styles["Normal"]
    
    # Title
    elements.append(Paragraph("Bias-Aware Resume Screener", title_style))
    elements.append(Paragraph("Compliance Audit Report (EEOC Four-Fifths Rule)", styles["Heading2"]))
    elements.append(Spacer(1, 12))

    # Summary Information
    summary_text = f"""
    <b>Report ID:</b> {report_data.get('report_id')}<br/>
    <b>Generated At:</b> {report_data.get('generated_at')}<br/>
    <b>Total Applicants:</b> {report_data['summary']['total_applicants']}<br/>
    <b>Reviewed Candidates:</b> {report_data['summary']['reviewed_candidates']}<br/>
    <b>EEOC Parity Status:</b> {report_data['summary']['eeoc_four_fifths_parity_status']}<br/>
    <b>Lowest Impact Ratio:</b> {report_data['summary']['lowest_parity_impact_ratio']}
    """
    elements.append(Paragraph(summary_text, normal_style))
    elements.append(Spacer(1, 20))
    
    elements.append(Paragraph("<b>EEOC Four-Fifths Parity Audit Result:</b>", normal_style))
    elements.append(Paragraph(report_data['summary']['parity_improvement_note'], normal_style))
    elements.append(Spacer(1, 20))

    # Candidate Decisions Table
    elements.append(Paragraph("<b>Candidate Decisions & Human Override Audit Trail</b>", styles["Heading3"]))
    elements.append(Spacer(1, 10))

    table_data = [
        [
            "Anonymized ID",
            "Evidence AI Score",
            "ATS Score",
            "HR Decision",
            "Override Reason / Justification",
            "Reviewer",
        ]
    ]

    for c in candidates:
        override = c.get("override_reason") or "Standard evaluation."
        table_data.append([
            c.get("anonymized_id", ""),
            f"{c.get('evidence_score', 0.0)}%",
            f"{c.get('ats_score', 0.0)}%",
            c.get("decision", "PENDING"),
            Paragraph(override, normal_style),
            c.get("reviewer_name", "HR Reviewer"),
        ])

    table = Table(table_data, colWidths=[80, 100, 70, 80, 300, 80])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#4f46e5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
        ('ALIGN', (0, 1), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 1, colors.HexColor("#e2e8f0")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    
    elements.append(table)
    doc.build(elements)
    
    pdf_value = buffer.getvalue()
    buffer.close()
    return pdf_value


def reset_database() -> None:
    """Clear all session evaluations, demographics, decisions, and audit logs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM candidates")
    cursor.execute("DELETE FROM demographics")
    cursor.execute("DELETE FROM hr_decisions")
    cursor.execute("DELETE FROM audit_log")
    conn.commit()
    conn.close()
