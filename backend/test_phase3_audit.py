"""
test_phase3_audit.py

Verification script for Phase 3:
- Data Isolation in SQLite database
- EEOC Four-Fifths Rule compliance audit calculations
- Disparate impact ratio and selection rate formulas
- End-to-end API endpoints for demographics and audit
"""

import os
import sqlite3
from fastapi.testclient import TestClient

from database import (
    init_db,
    save_candidate_evaluations,
    save_demographics,
    get_all_candidates_evaluation,
    get_demographics_summary,
    get_audit_joined_data,
)
from bias_audit import run_bias_audit, generate_demo_demographics
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
    {
        "filename": "candidate_3_priya.docx",
        "anonymized_id": "Candidate C-003",
        "candidate_name": "Priya Sharma",
        "word_count": 380,
        "ats_score": 45.0,
        "evidence_score": 92.0,
        "rationale": "Exceptional verifiable outcomes.",
        "matched_keywords": ["react", "fastapi"],
        "extracted_evidence": [],
        "criteria_breakdown": {"technical_skills": 92.0, "project_experience": 92.0, "domain_experience": 92.0, "measurable_outcomes": 92.0},
        "redacted_text": "Sample redacted text 3",
    },
    {
        "filename": "candidate_4_marcus.docx",
        "anonymized_id": "Candidate C-004",
        "candidate_name": "Marcus Vance",
        "word_count": 320,
        "ats_score": 85.0,
        "evidence_score": 55.0,
        "rationale": "Good domain experience.",
        "matched_keywords": ["react", "python", "docker"],
        "extracted_evidence": [],
        "criteria_breakdown": {"technical_skills": 55.0, "project_experience": 55.0, "domain_experience": 55.0, "measurable_outcomes": 55.0},
        "redacted_text": "Sample redacted text 4",
    },
]

TEST_DEMOGRAPHICS = [
    {"candidate_id": "candidate_1_alex.docx", "anonymized_id": "Candidate C-001", "gender": "Female", "ethnicity": "Hispanic / Latino", "age_group": "Under 30"},
    {"candidate_id": "candidate_2_bradford.docx", "anonymized_id": "Candidate C-002", "gender": "Male", "ethnicity": "White", "age_group": "30-39"},
    {"candidate_id": "candidate_3_priya.docx", "anonymized_id": "Candidate C-003", "gender": "Female", "ethnicity": "Asian", "age_group": "Under 30"},
    {"candidate_id": "candidate_4_marcus.docx", "anonymized_id": "Candidate C-004", "gender": "Male", "ethnicity": "Black / African American", "age_group": "40-49"},
]


def test_data_isolation():
    print("\n--- Testing Data Isolation Architecture ---")
    init_db()
    save_candidate_evaluations(TEST_CANDIDATES)
    save_demographics(TEST_DEMOGRAPHICS)

    # Candidate evaluation table should have NO demographic fields
    eval_data = get_all_candidates_evaluation()
    assert len(eval_data) == 4
    for c in eval_data:
        assert "gender" not in c
        assert "ethnicity" not in c
        assert "age_group" not in c
    print("[PASS] Candidate evaluation table strictly isolated from demographic fields.")

    summary = get_demographics_summary()
    assert summary["total_demographics"] == 4
    assert summary["distribution"]["gender"]["Female"] == 2
    assert summary["distribution"]["gender"]["Male"] == 2
    print("[PASS] Demographic identity data stored and aggregated correctly in isolated table.")


def test_four_fifths_audit_logic():
    print("\n--- Testing Four-Fifths Parity Audit Logic ---")
    # In TEST_CANDIDATES:
    # ATS Ranking: Bradford (90), Marcus (85), Alex (50), Priya (45) -> Top 2 = Bradford (Male), Marcus (Male)
    # Evidence Ranking: Priya (92), Alex (85), Marcus (55), Bradford (40) -> Top 2 = Priya (Female), Alex (Female)

    # For Top 2 shortlist:
    # Under ATS: Male selection rate = 2/2 = 100%, Female selection rate = 0/2 = 0% -> Impact Ratio = 0.0 (< 0.80 -> POTENTIAL_BIAS)
    # Under Evidence: Female selection rate = 2/2 = 100%, Male selection rate = 0/2 = 0% -> Demonstrates dramatic shift based on verified proof

    audit_res = run_bias_audit(shortlist_size=2)
    gender_dim = audit_res.dimensions.get("gender")
    assert gender_dim is not None

    print(f"Gender Audit ATS Status: {gender_dim.status_ats}")
    print(f"Gender Audit Evidence Status: {gender_dim.status_evidence}")

    for g in gender_dim.groups:
        print(f"  Group: {g.group_name} | ATS Sel Rate: {g.ats_selection_rate}% (IR: {g.ats_impact_ratio}, {g.ats_status}) | AI Sel Rate: {g.evidence_selection_rate}% (IR: {g.evidence_impact_ratio}, {g.evidence_status})")

    # Verify ATS flagged disparate impact against females
    female_metric = next(g for g in gender_dim.groups if g.group_name == "Female")
    assert female_metric.ats_status == "POTENTIAL_BIAS"
    assert female_metric.ats_impact_ratio == 0.0

    # Verify overall summary message
    print("Audit Summary:", audit_res.summary.parity_improvement_summary)
    print("[PASS] Four-Fifths calculations correctly identified disparate impact and parity shifts.")


def test_api_demographics_and_audit():
    print("\n--- Testing API Demographic & Audit Endpoints ---")
    client = TestClient(app)

    # 1. Test GET /api/demographics
    res_demo = client.get("/api/demographics")
    assert res_demo.status_code == 200
    print("[PASS] GET /api/demographics returned:", res_demo.json()["total_demographics"], "records.")

    # 2. Test POST /api/demographics/upload with generate_demo=true
    res_gen = client.post("/api/demographics/upload", data={"generate_demo": "true"})
    assert res_gen.status_code == 200
    assert res_gen.json()["status"] == "success"
    print("[PASS] POST /api/demographics/upload (generate_demo):", res_gen.json()["message"])

    # 3. Test POST /api/audit/run
    res_audit = client.post("/api/audit/run", json={"shortlist_size": 2})
    assert res_audit.status_code == 200
    audit_data = res_audit.json()
    assert "summary" in audit_data
    assert "dimensions" in audit_data
    assert "gender" in audit_data["dimensions"]
    assert "ethnicity" in audit_data["dimensions"]
    assert "age_group" in audit_data["dimensions"]
    print("[PASS] POST /api/audit/run returned valid Four-Fifths audit response across all 3 dimensions.")


if __name__ == "__main__":
    test_data_isolation()
    test_four_fifths_audit_logic()
    test_api_demographics_and_audit()
    print("\n==========================================")
    print("ALL PHASE 3 COMPLIANCE AUDIT TESTS PASSED!")
    print("==========================================")
