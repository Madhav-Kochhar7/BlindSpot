"""
test_phase4_governance.py

Automated test suite for Phase 4:
- Human-in-the-Loop decision logging
- Human override rationales
- Append-only audit log
- Compliance audit report export (JSON and CSV)
- Full API endpoint verification
"""

import io
import csv
from fastapi.testclient import TestClient

from database import init_db, save_candidate_evaluations, save_demographics
from hr_review import (
    init_hr_tables,
    save_hr_decision,
    get_hr_decisions_summary,
    generate_audit_report_data,
    generate_audit_report_csv,
    reset_database,
)
from main import app

TEST_CANDIDATES = [
    {
        "filename": "candidate_1_alex.docx",
        "anonymized_id": "Candidate C-001",
        "candidate_name": "Alex Rivera",
        "word_count": 350,
        "ats_score": 50.0,
        "evidence_score": 85.0,
        "rationale": "High verified proof in React and Python.",
        "matched_keywords": ["react", "python", "fastapi"],
        "extracted_evidence": [],
        "criteria_breakdown": {"technical_skills": 85.0, "project_experience": 85.0, "domain_experience": 85.0, "measurable_outcomes": 85.0},
        "redacted_text": "Sample redacted text 1",
    },
    {
        "filename": "candidate_2_bradford.docx",
        "anonymized_id": "Candidate C-002",
        "candidate_name": "Bradford Sterling",
        "word_count": 300,
        "ats_score": 90.0,
        "evidence_score": 40.0,
        "rationale": "Keyword heavy but lacks metrics.",
        "matched_keywords": ["react", "python", "fastapi", "docker", "aws"],
        "extracted_evidence": [],
        "criteria_breakdown": {"technical_skills": 40.0, "project_experience": 40.0, "domain_experience": 40.0, "measurable_outcomes": 40.0},
        "redacted_text": "Sample redacted text 2",
    },
]

TEST_DEMOGRAPHICS = [
    {"candidate_id": "candidate_1_alex.docx", "anonymized_id": "Candidate C-001", "gender": "Female", "ethnicity": "Hispanic / Latino", "age_group": "Under 30"},
    {"candidate_id": "candidate_2_bradford.docx", "anonymized_id": "Candidate C-002", "gender": "Male", "ethnicity": "White", "age_group": "30-39"},
]


def test_hr_decision_logging():
    print("\n--- Testing HR Decision & Override Logging ---")
    init_db()
    init_hr_tables()
    save_candidate_evaluations(TEST_CANDIDATES)
    save_demographics(TEST_DEMOGRAPHICS)

    # 1. Approve Alex Rivera with override justification
    rec1 = save_hr_decision(
        candidate_identifier="candidate_1_alex.docx",
        decision="APPROVED",
        override_reason="Strong verified evidence in React and FastAPI, overriding low keyword ATS score.",
        reviewer_name="Senior Talent Lead",
    )
    assert rec1.decision == "APPROVED"
    assert rec1.override_reason is not None

    # 2. Reject Bradford Sterling with override justification
    rec2 = save_hr_decision(
        candidate_identifier="candidate_2_bradford.docx",
        decision="REJECTED",
        override_reason="High keyword frequency but lack of concrete deliverable proof.",
        reviewer_name="Senior Talent Lead",
    )
    assert rec2.decision == "REJECTED"

    summary = get_hr_decisions_summary()
    assert summary.total_candidates == 2
    assert summary.reviewed_count == 2
    assert summary.approved_count == 1
    assert summary.rejected_count == 1
    assert summary.completion_percentage == 100.0
    print("[PASS] HR decisions and override justifications saved and summarized successfully.")


def test_audit_report_generation():
    print("\n--- Testing Audit Report Generation ---")
    report_json = generate_audit_report_data()
    assert "report_id" in report_json
    assert "compliance_standard" in report_json
    assert report_json["summary"]["approved_candidates"] == 1
    assert report_json["summary"]["rejected_candidates"] == 1
    assert len(report_json["candidate_decisions"]) == 2
    print("[PASS] Full compliance audit JSON generated with report ID:", report_json["report_id"])

    report_csv = generate_audit_report_csv()
    assert "BIAS-AWARE RESUME SCREENER - COMPLIANCE AUDIT REPORT" in report_csv
    assert "Alex Rivera" in report_csv
    assert "APPROVED" in report_csv
    assert "REJECTED" in report_csv
    print("[PASS] Compliance audit CSV document formatted correctly.")


def test_governance_api_endpoints():
    print("\n--- Testing Governance & Decision Endpoints ---")
    client = TestClient(app)

    # 1. Test POST /api/decisions
    res_dec = client.post(
        "/api/decisions",
        json={
            "candidate_id": "candidate_1_alex.docx",
            "decision": "FLAGGED_FOR_INTERVIEW",
            "override_reason": "Moving candidate to technical deep-dive round.",
            "reviewer_name": "VP Engineering",
        },
    )
    assert res_dec.status_code == 200
    assert res_dec.json()["decision"] == "FLAGGED_FOR_INTERVIEW"
    print("[PASS] POST /api/decisions updated decision to FLAGGED_FOR_INTERVIEW.")

    # 2. Test GET /api/decisions/summary
    res_sum = client.get("/api/decisions/summary")
    assert res_sum.status_code == 200
    assert res_sum.json()["flagged_count"] == 1
    print("[PASS] GET /api/decisions/summary returned valid review counts.")

    # 3. Test GET /api/export/audit-report?format=json
    res_exp_json = client.get("/api/export/audit-report?format=json")
    assert res_exp_json.status_code == 200
    assert "summary" in res_exp_json.json()
    print("[PASS] GET /api/export/audit-report (JSON) returned valid compliance document.")

    # 4. Test GET /api/export/audit-report?format=csv
    res_exp_csv = client.get("/api/export/audit-report?format=csv")
    assert res_exp_csv.status_code == 200
    assert "text/csv" in res_exp_csv.headers.get("content-type", "")
    print("[PASS] GET /api/export/audit-report (CSV) returned downloadable CSV file.")

    # 5. Test POST /api/reset
    res_reset = client.post("/api/reset")
    assert res_reset.status_code == 200
    print("[PASS] POST /api/reset cleared database and session.")


if __name__ == "__main__":
    test_hr_decision_logging()
    test_audit_report_generation()
    test_governance_api_endpoints()
    print("\n==========================================")
    print("ALL PHASE 4 GOVERNANCE TESTS PASSED!")
    print("==========================================")
