"""
bias_audit.py

EEOC Four-Fifths (80%) Rule Compliance Audit Engine for Bias-Aware Resume Screener.

Evaluates selection rates and disparate impact ratios across demographic dimensions:
- Gender
- Ethnicity / Race
- Age Group

Compares Traditional ATS Keyword Shortlists against Evidence-Based AI Shortlists to
quantify algorithmic bias reduction and compliance with the Uniform Guidelines
on Employee Selection Procedures (UGESP).
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from database import get_audit_joined_data, save_demographics


# Pydantic Schemas for Audit Responses


class GroupAuditMetric(BaseModel):
    group_name: str
    total_applicants: int
    applicant_pool_pct: float
    # ATS Shortlist metrics
    ats_selected_count: int
    ats_shortlist_pct: float
    ats_selection_rate: float
    ats_impact_ratio: float
    ats_status: str  # "PASS" | "POTENTIAL_BIAS" | "BENCHMARK"
    # Evidence Shortlist metrics
    evidence_selected_count: int
    evidence_shortlist_pct: float
    evidence_selection_rate: float
    evidence_impact_ratio: float
    evidence_status: str  # "PASS" | "POTENTIAL_BIAS" | "BENCHMARK"
    # Delta (Improvement in impact ratio)
    impact_ratio_delta: float


class DimensionAudit(BaseModel):
    dimension_name: str
    benchmark_group_ats: str
    highest_rate_ats: float
    lowest_impact_ratio_ats: float
    status_ats: str
    benchmark_group_evidence: str
    highest_rate_evidence: float
    lowest_impact_ratio_evidence: float
    status_evidence: str
    groups: List[GroupAuditMetric]


class BiasAuditSummary(BaseModel):
    total_candidates: int
    shortlist_size: int
    ats_overall_status: str  # "PASS" | "POTENTIAL_BIAS"
    evidence_overall_status: str  # "PASS" | "POTENTIAL_BIAS"
    ats_flagged_count: int
    evidence_flagged_count: int
    lowest_ats_impact_ratio: float
    lowest_evidence_impact_ratio: float
    parity_improvement_summary: str


class BiasAuditResponse(BaseModel):
    summary: BiasAuditSummary
    dimensions: Dict[str, DimensionAudit]


# Audit Engine Calculations


def _calculate_dimension_audit(
    records: List[Dict[str, Any]],
    dimension_key: str,
    dimension_title: str,
    top_ats_filenames: set[str],
    top_evidence_filenames: set[str],
    shortlist_size: int,
) -> DimensionAudit:
    total_pool = len(records)
    if total_pool == 0:
        return DimensionAudit(
            dimension_name=dimension_title,
            benchmark_group_ats="N/A",
            highest_rate_ats=0.0,
            lowest_impact_ratio_ats=1.0,
            status_ats="PASS",
            benchmark_group_evidence="N/A",
            highest_rate_evidence=0.0,
            lowest_impact_ratio_evidence=1.0,
            status_evidence="PASS",
            groups=[],
        )

    # Group counts
    group_totals: Dict[str, int] = {}
    group_ats_selected: Dict[str, int] = {}
    group_evidence_selected: Dict[str, int] = {}

    for r in records:
        grp = r.get(dimension_key) or "Unspecified"
        group_totals[grp] = group_totals.get(grp, 0) + 1
        fname = r["filename"]
        if fname in top_ats_filenames:
            group_ats_selected[grp] = group_ats_selected.get(grp, 0) + 1
        if fname in top_evidence_filenames:
            group_evidence_selected[grp] = group_evidence_selected.get(grp, 0) + 1

    # Selection rates
    ats_selection_rates: Dict[str, float] = {}
    evidence_selection_rates: Dict[str, float] = {}

    for grp, count in group_totals.items():
        ats_sel = group_ats_selected.get(grp, 0)
        ev_sel = group_evidence_selected.get(grp, 0)
        ats_selection_rates[grp] = round((ats_sel / count) * 100.0, 1)
        evidence_selection_rates[grp] = round((ev_sel / count) * 100.0, 1)

    # Find highest selection rates (benchmarks)
    highest_rate_ats = max(ats_selection_rates.values()) if ats_selection_rates else 0.0
    highest_rate_evidence = max(evidence_selection_rates.values()) if evidence_selection_rates else 0.0

    benchmark_grp_ats = next(
        (g for g, r in ats_selection_rates.items() if r == highest_rate_ats and r > 0),
        "None",
    )
    benchmark_grp_evidence = next(
        (g for g, r in evidence_selection_rates.items() if r == highest_rate_evidence and r > 0),
        "None",
    )

    group_metrics: List[GroupAuditMetric] = []
    lowest_ir_ats = 1.0
    lowest_ir_ev = 1.0

    for grp in sorted(group_totals.keys()):
        total_grp = group_totals[grp]
        pool_pct = round((total_grp / total_pool) * 100.0, 1)

        # ATS Calculations
        ats_sel = group_ats_selected.get(grp, 0)
        ats_shortlist_pct = round((ats_sel / max(shortlist_size, 1)) * 100.0, 1)
        ats_sr = ats_selection_rates[grp]

        if highest_rate_ats > 0:
            ats_ir = round(ats_sr / highest_rate_ats, 2)
        else:
            ats_ir = 1.0

        if ats_sr == highest_rate_ats and highest_rate_ats > 0:
            ats_status = "BENCHMARK"
        elif ats_ir < 0.80:
            ats_status = "POTENTIAL_BIAS"
            lowest_ir_ats = min(lowest_ir_ats, ats_ir)
        else:
            ats_status = "PASS"

        # Evidence Calculations
        ev_sel = group_evidence_selected.get(grp, 0)
        ev_shortlist_pct = round((ev_sel / max(shortlist_size, 1)) * 100.0, 1)
        ev_sr = evidence_selection_rates[grp]

        if highest_rate_evidence > 0:
            ev_ir = round(ev_sr / highest_rate_evidence, 2)
        else:
            ev_ir = 1.0

        if ev_sr == highest_rate_evidence and highest_rate_evidence > 0:
            ev_status = "BENCHMARK"
        elif ev_ir < 0.80:
            ev_status = "POTENTIAL_BIAS"
            lowest_ir_ev = min(lowest_ir_ev, ev_ir)
        else:
            ev_status = "PASS"

        ir_delta = round(ev_ir - ats_ir, 2)

        group_metrics.append(
            GroupAuditMetric(
                group_name=grp,
                total_applicants=total_grp,
                applicant_pool_pct=pool_pct,
                ats_selected_count=ats_sel,
                ats_shortlist_pct=ats_shortlist_pct,
                ats_selection_rate=ats_sr,
                ats_impact_ratio=ats_ir,
                ats_status=ats_status,
                evidence_selected_count=ev_sel,
                evidence_shortlist_pct=ev_shortlist_pct,
                evidence_selection_rate=ev_sr,
                evidence_impact_ratio=ev_ir,
                evidence_status=ev_status,
                impact_ratio_delta=ir_delta,
            )
        )

    # Dimension overall status
    dim_status_ats = "POTENTIAL_BIAS" if any(g.ats_status == "POTENTIAL_BIAS" for g in group_metrics) else "PASS"
    dim_status_ev = "POTENTIAL_BIAS" if any(g.evidence_status == "POTENTIAL_BIAS" for g in group_metrics) else "PASS"

    return DimensionAudit(
        dimension_name=dimension_title,
        benchmark_group_ats=benchmark_grp_ats,
        highest_rate_ats=highest_rate_ats,
        lowest_impact_ratio_ats=lowest_ir_ats,
        status_ats=dim_status_ats,
        benchmark_group_evidence=benchmark_grp_evidence,
        highest_rate_evidence=highest_rate_evidence,
        lowest_impact_ratio_evidence=lowest_ir_ev,
        status_evidence=dim_status_ev,
        groups=group_metrics,
    )


def run_bias_audit(
    shortlist_size: int = 5,
    custom_records: Optional[List[Dict[str, Any]]] = None,
) -> BiasAuditResponse:
    """
    Execute Four-Fifths Rule compliance audit across Gender, Ethnicity, and Age.
    """
    records = custom_records if custom_records is not None else get_audit_joined_data()
    total_candidates = len(records)

    if total_candidates == 0:
        return BiasAuditResponse(
            summary=BiasAuditSummary(
                total_candidates=0,
                shortlist_size=shortlist_size,
                ats_overall_status="PASS",
                evidence_overall_status="PASS",
                ats_flagged_count=0,
                evidence_flagged_count=0,
                lowest_ats_impact_ratio=1.0,
                lowest_evidence_impact_ratio=1.0,
                parity_improvement_summary="No candidate records found to audit.",
            ),
            dimensions={},
        )

    effective_shortlist_size = min(shortlist_size, total_candidates)

    # Determine Top N for ATS and Evidence
    sorted_by_ats = sorted(records, key=lambda r: r.get("ats_score", 0.0), reverse=True)
    top_ats_files = {r["filename"] for r in sorted_by_ats[:effective_shortlist_size]}

    sorted_by_evidence = sorted(records, key=lambda r: r.get("evidence_score", 0.0), reverse=True)
    top_evidence_files = {r["filename"] for r in sorted_by_evidence[:effective_shortlist_size]}

    gender_audit = _calculate_dimension_audit(
        records, "gender", "Gender", top_ats_files, top_evidence_files, effective_shortlist_size
    )
    ethnicity_audit = _calculate_dimension_audit(
        records, "ethnicity", "Ethnicity / Race", top_ats_files, top_evidence_files, effective_shortlist_size
    )
    age_audit = _calculate_dimension_audit(
        records, "age_group", "Age Group", top_ats_files, top_evidence_files, effective_shortlist_size
    )

    dimensions = {
        "gender": gender_audit,
        "ethnicity": ethnicity_audit,
        "age_group": age_audit,
    }

    # Calculate overall audit summary
    ats_flagged = sum(1 for d in dimensions.values() if d.status_ats == "POTENTIAL_BIAS")
    ev_flagged = sum(1 for d in dimensions.values() if d.status_evidence == "POTENTIAL_BIAS")

    lowest_ir_ats = min((d.lowest_impact_ratio_ats for d in dimensions.values()), default=1.0)
    lowest_ir_ev = min((d.lowest_impact_ratio_evidence for d in dimensions.values()), default=1.0)

    ats_status = "POTENTIAL_BIAS" if ats_flagged > 0 else "PASS"
    ev_status = "POTENTIAL_BIAS" if ev_flagged > 0 else "PASS"

    if ats_flagged > ev_flagged:
        summary_msg = (
            f"Evidence-based scoring reduced disparate impact flags from {ats_flagged} down to {ev_flagged}, "
            f"raising lowest selection parity ratio from {int(lowest_ir_ats*100)}% to {int(lowest_ir_ev*100)}%."
        )
    elif ev_flagged == 0 and ats_flagged == 0:
        summary_msg = "Both screening methods satisfy the EEOC Four-Fifths (80%) Parity Rule across all evaluated groups."
    else:
        summary_msg = (
            f"Evidence scoring maintains {int(lowest_ir_ev*100)}% lowest group parity "
            f"compared to {int(lowest_ir_ats*100)}% under traditional ATS."
        )

    return BiasAuditResponse(
        summary=BiasAuditSummary(
            total_candidates=total_candidates,
            shortlist_size=effective_shortlist_size,
            ats_overall_status=ats_status,
            evidence_overall_status=ev_status,
            ats_flagged_count=ats_flagged,
            evidence_flagged_count=ev_flagged,
            lowest_ats_impact_ratio=lowest_ir_ats,
            lowest_evidence_impact_ratio=lowest_ir_ev,
            parity_improvement_summary=summary_msg,
        ),
        dimensions=dimensions,
    )


# Demo Demographic Data Generator


def generate_demo_demographics(candidates: List[Dict[str, Any]]) -> int:
    """
    Generate realistic demographic profiles corresponding to current candidates.
    Distributes genders, ethnicities, and age groups across applicants.
    """
    records: List[Dict[str, str]] = []

    # Realistic distribution patterns for diverse evaluation
    genders = ["Female", "Male", "Female", "Male", "Non-Binary", "Female", "Male"]
    ethnicities = [
        "Hispanic / Latino",
        "White",
        "Asian",
        "Black / African American",
        "Two or More",
        "Asian",
        "Hispanic / Latino",
    ]
    age_groups = ["Under 30", "30-39", "40-49", "30-39", "50+", "Under 30", "40-49"]

    for i, c in enumerate(candidates):
        identifier = c.get("filename") or c.get("anonymized_id") or f"Candidate C-{i+1:03d}"
        anon_id = c.get("anonymized_id") or f"Candidate C-{i+1:03d}"

        gender = genders[i % len(genders)]
        ethnicity = ethnicities[i % len(ethnicities)]
        age_group = age_groups[i % len(age_groups)]

        records.append({
            "candidate_id": identifier,
            "anonymized_id": anon_id,
            "gender": gender,
            "ethnicity": ethnicity,
            "age_group": age_group,
        })

    return save_demographics(records)
