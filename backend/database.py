"""
database.py

SQLite Data Isolation Layer for Bias-Aware Resume Screener (Phase 3).

Enforces strict database-level architectural separation between:
1. Candidate Evaluation Data (`candidates` table) - accessible to scoring models & shortlisters.
2. Demographic Identity Data (`demographics` table) - completely isolated, strictly accessible
   only to the post-hoc governance and compliance audit engine.

This guarantees that LLM scoring agents and ATS matchers have ZERO access to demographic attributes.
"""

from __future__ import annotations

import hashlib
import json
import os
import sqlite3
from typing import Any, Dict, List, Optional

DB_PATH = os.environ.get(
    "SQLITE_DB_PATH",
    os.path.join(os.path.dirname(__file__), "screener.db"),
)


def get_db_connection() -> sqlite3.Connection:
    """Create a database connection with row factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize isolated tables."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Table 1: Candidate Evaluation Data (Zero demographic data allowed)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE NOT NULL,
            anonymized_id TEXT NOT NULL,
            candidate_name TEXT NOT NULL,
            word_count INTEGER DEFAULT 0,
            ats_score REAL DEFAULT 0.0,
            evidence_score REAL DEFAULT 0.0,
            rationale TEXT,
            matched_keywords_json TEXT,
            extracted_evidence_json TEXT,
            criteria_breakdown_json TEXT,
            redacted_text TEXT,
            extracted_text_hash TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    # Table 2: Demographic Identity Data (Isolated demographic attributes for compliance)
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS demographics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            candidate_identifier TEXT UNIQUE NOT NULL, -- matches filename or anonymized_id
            anonymized_id TEXT NOT NULL,
            gender TEXT NOT NULL,
            ethnicity TEXT NOT NULL,
            age_group TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.commit()
    conn.close()


# Candidate Evaluation Operations (Model Pipeline Side)


def save_candidate_evaluations(candidates: List[Dict[str, Any]]) -> None:
    """
    Persist or update candidate evaluation results.
    Demographic attributes are strictly forbidden here.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    for c in candidates:
        matched_kw_json = json.dumps(c.get("matched_keywords", []))
        extracted_ev_json = json.dumps([
            item if isinstance(item, dict) else item.dict()
            for item in c.get("extracted_evidence", [])
        ])
        crit_json = json.dumps(
            c.get("criteria_breakdown")
            if isinstance(c.get("criteria_breakdown"), dict)
            else (c.get("criteria_breakdown").dict() if c.get("criteria_breakdown") else {})
        )
        text_hash = hashlib.sha256((c.get("redacted_text") or "").encode("utf-8")).hexdigest()

        cursor.execute(
            """
            INSERT INTO candidates (
                filename, anonymized_id, candidate_name, word_count,
                ats_score, evidence_score, rationale, matched_keywords_json,
                extracted_evidence_json, criteria_breakdown_json, redacted_text,
                extracted_text_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(filename) DO UPDATE SET
                anonymized_id = excluded.anonymized_id,
                candidate_name = excluded.candidate_name,
                word_count = excluded.word_count,
                ats_score = excluded.ats_score,
                evidence_score = excluded.evidence_score,
                rationale = excluded.rationale,
                matched_keywords_json = excluded.matched_keywords_json,
                extracted_evidence_json = excluded.extracted_evidence_json,
                criteria_breakdown_json = excluded.criteria_breakdown_json,
                redacted_text = excluded.redacted_text,
                extracted_text_hash = excluded.extracted_text_hash,
                created_at = CURRENT_TIMESTAMP
            """,
            (
                c["filename"],
                c["anonymized_id"],
                c.get("candidate_name", ""),
                c.get("word_count", 0),
                c.get("ats_score", 0.0),
                c.get("evidence_score", 0.0),
                c.get("rationale", ""),
                matched_kw_json,
                extracted_ev_json,
                crit_json,
                c.get("redacted_text", ""),
                text_hash,
            ),
        )

    conn.commit()
    conn.close()


def get_all_candidates_evaluation() -> List[Dict[str, Any]]:
    """
    Retrieve candidate evaluations.
    Notice: No demographic data is returned here.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM candidates ORDER BY evidence_score DESC")
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results


# Demographic Identity Operations (Governance Side)


def save_demographics(records: List[Dict[str, str]]) -> int:
    """
    Ingest demographic records.
    Matches records by candidate_id, anonymized_id, or filename.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    inserted = 0

    for r in records:
        identifier = r.get("candidate_id") or r.get("filename") or r.get("anonymized_id")
        if not identifier:
            continue

        anonymized_id = r.get("anonymized_id") or identifier
        gender = r.get("gender", "Unspecified").strip().title()
        ethnicity = r.get("ethnicity", "Unspecified").strip().title()
        age_group = r.get("age_group", "Unspecified").strip()

        cursor.execute(
            """
            INSERT INTO demographics (
                candidate_identifier, anonymized_id, gender, ethnicity, age_group, created_at
            ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(candidate_identifier) DO UPDATE SET
                anonymized_id = excluded.anonymized_id,
                gender = excluded.gender,
                ethnicity = excluded.ethnicity,
                age_group = excluded.age_group,
                created_at = CURRENT_TIMESTAMP
            """,
            (identifier, anonymized_id, gender, ethnicity, age_group),
        )
        inserted += 1

    conn.commit()
    conn.close()
    return inserted


def get_demographics_summary() -> Dict[str, Any]:
    """Retrieve demographic counts and distribution without individual scores."""
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM demographics")
    total_demographics = cursor.fetchone()[0]

    cursor.execute("SELECT gender, COUNT(*) as count FROM demographics GROUP BY gender")
    gender_dist = {row["gender"]: row["count"] for row in cursor.fetchall()}

    cursor.execute("SELECT ethnicity, COUNT(*) as count FROM demographics GROUP BY ethnicity")
    ethnicity_dist = {row["ethnicity"]: row["count"] for row in cursor.fetchall()}

    cursor.execute("SELECT age_group, COUNT(*) as count FROM demographics GROUP BY age_group")
    age_dist = {row["age_group"]: row["count"] for row in cursor.fetchall()}

    cursor.execute("SELECT COUNT(*) FROM candidates")
    total_candidates = cursor.fetchone()[0]

    conn.close()

    return {
        "total_demographics": total_demographics,
        "total_candidates": total_candidates,
        "is_complete": total_demographics >= total_candidates and total_candidates > 0,
        "distribution": {
            "gender": gender_dist,
            "ethnicity": ethnicity_dist,
            "age_group": age_dist,
        },
    }


def get_audit_joined_data() -> List[Dict[str, Any]]:
    """
    Strictly utilized by the Four-Fifths Compliance Audit Engine.
    Combines evaluation scores with demographic categories to calculate disparate impact.
    """
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Match demographics by anonymized_id or filename
    cursor.execute(
        """
        SELECT 
            c.filename,
            c.anonymized_id,
            c.candidate_name,
            c.ats_score,
            c.evidence_score,
            COALESCE(d.gender, 'Unspecified') as gender,
            COALESCE(d.ethnicity, 'Unspecified') as ethnicity,
            COALESCE(d.age_group, 'Unspecified') as age_group
        FROM candidates c
        LEFT JOIN demographics d 
            ON c.anonymized_id = d.anonymized_id 
            OR c.filename = d.candidate_identifier
            OR c.anonymized_id = d.candidate_identifier
        """
    )
    rows = cursor.fetchall()
    results = [dict(row) for row in rows]
    conn.close()
    return results
