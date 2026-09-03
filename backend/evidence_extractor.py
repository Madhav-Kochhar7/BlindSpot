"""
evidence_extractor.py

LLM Evidence Extraction & Evidence-Based Scoring Agent for Bias-Aware Resume Screener.

Evaluates candidates on verifiable proof of competencies rather than mere
keyword mentions. Evaluates 4 core weighted criteria:
1. Technical Skills Evidence (40%)
2. Project Experience (25%)
3. Domain/Work Experience (20%)
4. Measurable Outcomes & Achievements (15%)

Supports:
- OpenAI API (gpt-4o / gpt-4o-mini / gpt-3.5-turbo)
- Anthropic API (claude-3-5-sonnet / claude-3-haiku)
- High-fidelity Mock Fallback Agent when API keys are not provided or on error.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

from ats_scorer import extract_keywords


# Pydantic models for structured output


class ExtractedEvidenceItem(BaseModel):
    skill: str = Field(..., description="The specific skill or competency evaluated.")
    evidence_quote: str = Field(
        ...,
        description="Direct verbatim sentence/bullet quote from resume proving experience, or 'No evidence provided'.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence level in the validity and depth of evidence (0.0 to 1.0).",
    )


class CriteriaBreakdown(BaseModel):
    technical_skills: float = Field(
        ..., ge=0.0, le=100.0, description="Evidence score for core technical skills (40% weight)."
    )
    project_experience: float = Field(
        ..., ge=0.0, le=100.0, description="Depth of project & architectural execution (25% weight)."
    )
    domain_experience: float = Field(
        ..., ge=0.0, le=100.0, description="Relevance of domain and work history (20% weight)."
    )
    measurable_outcomes: float = Field(
        ..., ge=0.0, le=100.0, description="Quantified impact, metrics, and achievements (15% weight)."
    )
    open_source_portfolio: float = Field(
        ..., ge=0.0, le=100.0, description="Quality, impact, and verification of GitHub/Open Source projects (15% weight)."
    )


class EvidenceResult(BaseModel):
    candidate_id: str
    evidence_score: float = Field(..., ge=0.0, le=100.0)
    rationale: str
    criteria_breakdown: CriteriaBreakdown
    extracted_evidence: List[ExtractedEvidenceItem]
    is_mock: bool = False


# Extraction Prompt Template


EVIDENCE_PROMPT_SYSTEM = """You are an expert, unbiased Technical Hiring Auditor specializing in Blind Evidence-Based candidate assessment.
Your role is to rigorously evaluate an anonymized candidate resume against a Job Description.

Do NOT evaluate based on school pedigree, candidate name, or buzzwords. Evaluate ONLY on concrete, verifiable evidence found in the text.

Scoring Criteria (0-100 each):
1. Technical Skills Evidence (30% weight): Verifiable proof of core technical tools, languages, and frameworks.
2. Project Experience (25% weight): Complexity of projects built, architecture ownership, and hands-on deliverables.
3. Domain/Work Experience (15% weight): Relevant industry context, problem complexity, and responsibilities.
4. Measurable Outcomes & Achievements (15% weight): Quantified metrics, performance improvements, scale, user numbers, latency reductions.
5. Open Source Portfolio (15% weight): Cross-reference the resume's claims with the fetched GitHub repository metadata provided in the context.

Calculated Overall Score formula:
evidence_score = round(0.30 * technical_skills + 0.25 * project_experience + 0.15 * domain_experience + 0.15 * measurable_outcomes + 0.15 * open_source_portfolio, 1)

For every key skill or requirement found in the Job Description (up to 8 key skills):
- Extract the exact direct quote from the resume showing proof of application.
- If no proof exists in the resume, set evidence_quote to "No direct project or work evidence provided." and confidence to 0.0.
- Set confidence (0.0 to 1.0) based on whether the quote describes active production usage vs just passive listing.

You MUST reply ONLY with a valid JSON object matching this schema:
{
  "candidate_id": "<candidate_id>",
  "evidence_score": <float 0-100>,
  "rationale": "<2-3 sentence executive summary explaining the score based on verified proofs and gaps>",
  "criteria_breakdown": {
    "technical_skills": <float 0-100>,
    "project_experience": <float 0-100>,
    "domain_experience": <float 0-100>,
    "measurable_outcomes": <float 0-100>,
    "open_source_portfolio": <float 0-100>
  },
  "extracted_evidence": [
    {
      "skill": "<skill_name>",
      "evidence_quote": "<verbatim quote from resume or 'No direct project or work evidence provided.'>",
      "confidence": <float 0.0 - 1.0>
    }
  ]
}
"""


def _clean_json_text(text: str) -> str:
    """Strip markdown backticks or surrounding text if LLM included them."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


# High-Fidelity Mock Fallback Agent


def _mock_extract_and_score(
    redacted_resume: str,
    job_description: str,
    candidate_id: str,
) -> EvidenceResult:
    """
    Intelligent heuristic fallback when LLM API keys are unavailable.
    Performs sentence-level regex and proof extraction from the redacted text.
    """
    # 1. Identify key skills from Job Description
    job_skills = extract_keywords(job_description, top_n=10)
    if not job_skills:
        job_skills = ["Python", "FastAPI", "React", "TypeScript", "SQL", "Docker", "API Design", "Testing"]

    # Normalize lines and sentences
    lines = [ln.strip() for ln in redacted_resume.split("\n") if ln.strip()]
    full_text_lower = redacted_resume.lower()

    # Metrics regex (e.g., 40%, 10k, $500k, 5x, 99.9%, 100ms)
    metric_regex = re.compile(
        r"\b(?:\d+[%xX]|\$\d+(?:\.\d+)?[kKmMbB]?|\d+(?:,\d{3})*(?:\.\d+)?\s*(?:users|clients|qps|ms|req/s|fps|%|percent|reduction|increase|growth))\b"
    )
    # Action verbs denoting deep project execution
    action_verbs = [
        "built", "designed", "architected", "developed", "deployed", "implemented",
        "engineered", "scaled", "optimized", "created", "spearheaded", "integrated",
        "migrated", "automated", "reduced", "improved", "increased", "maintained"
    ]

    extracted_items: List[ExtractedEvidenceItem] = []
    found_skills_count = 0
    high_confidence_count = 0
    total_metrics_found = 0

    for skill in job_skills[:8]:
        skill_clean = skill.strip()
        skill_lower = skill_clean.lower()
        pattern = r"\b" + re.escape(skill_lower) + r"\b"

        matched_quote: Optional[str] = None
        best_confidence = 0.0

        for line in lines:
            if re.search(pattern, line.lower()):
                # Prefer lines with action verbs or metrics
                has_action = any(v in line.lower() for v in action_verbs)
                has_metric = bool(metric_regex.search(line))
                
                # Clean up line formatting
                cleaned_line = re.sub(r"^[\s•\-*]+", "", line).strip()
                if len(cleaned_line) < 15:
                    continue

                conf = 0.5
                if has_action and has_metric:
                    conf = 0.95
                elif has_action:
                    conf = 0.85
                elif has_metric:
                    conf = 0.80
                elif len(cleaned_line.split()) > 6:
                    conf = 0.65

                if conf > best_confidence:
                    best_confidence = conf
                    matched_quote = cleaned_line

        if matched_quote and best_confidence >= 0.5:
            found_skills_count += 1
            if best_confidence >= 0.8:
                high_confidence_count += 1
            extracted_items.append(
                ExtractedEvidenceItem(
                    skill=skill_clean.title() if len(skill_clean) > 3 else skill_clean.upper(),
                    evidence_quote=matched_quote,
                    confidence=best_confidence,
                )
            )
        else:
            extracted_items.append(
                ExtractedEvidenceItem(
                    skill=skill_clean.title() if len(skill_clean) > 3 else skill_clean.upper(),
                    evidence_quote="No direct project or work evidence provided in resume.",
                    confidence=0.0,
                )
            )

    # 2. Count measurable outcome indicators in the entire resume
    all_metrics = metric_regex.findall(redacted_resume)
    total_metrics_found = len(all_metrics)

    # 3. Calculate 4 core criteria scores (0-100)
    skills_ratio = found_skills_count / max(len(job_skills[:8]), 1)
    technical_score = min(100.0, round((skills_ratio * 70.0) + (high_confidence_count * 5.0) + 15.0, 1))

    # Project experience score based on action verbs and project blocks
    action_matches = sum(len(re.findall(r"\b" + v + r"\b", full_text_lower)) for v in action_verbs)
    project_score = min(100.0, round(min(action_matches * 6.5, 75.0) + (found_skills_count * 3.5), 1))

    # Domain score based on length, depth, and terminology
    word_count = len(redacted_resume.split())
    domain_score = min(100.0, round(min(word_count / 8.0, 60.0) + (skills_ratio * 35.0), 1))

    # Measurable outcomes score based on quantified metrics and achievements
    outcomes_score = min(100.0, round(min(total_metrics_found * 18.0, 70.0) + (high_confidence_count * 6.0) + 10.0, 1))

    # Mock Open Source score (just random heuristic based on link presence)
    has_github = "github.com" in full_text_lower
    open_source_score = 85.0 if has_github else 25.0

    # Overall weighted score
    overall_score = round(
        (0.30 * technical_score)
        + (0.25 * project_score)
        + (0.15 * domain_score)
        + (0.15 * outcomes_score)
        + (0.15 * open_source_score),
        1,
    )

    # Generate rationale
    if overall_score >= 80:
        rationale = (
            f"Candidate demonstrates exceptional verifiable proof across {found_skills_count} target skills "
            f"with {total_metrics_found} quantified impact metrics. Project descriptions showcase deep hands-on execution."
        )
    elif overall_score >= 60:
        rationale = (
            f"Solid evidence found for {found_skills_count} key technical competencies. "
            f"Contains concrete implementation quotes, though measurable outcome metrics could be stronger."
        )
    elif overall_score >= 40:
        rationale = (
            f"Moderate skill coverage ({found_skills_count} matches), but several key requirements lack concrete "
            f"project provenance or metric validation."
        )
    else:
        rationale = (
            f"Limited verifiable evidence detected. Most required competencies lack supporting implementation quotes "
            f"or quantifiable achievements in the redacted resume."
        )

    return EvidenceResult(
        candidate_id=candidate_id,
        evidence_score=overall_score,
        rationale=rationale,
        criteria_breakdown=CriteriaBreakdown(
            technical_skills=technical_score,
            project_experience=project_score,
            domain_experience=domain_score,
            measurable_outcomes=outcomes_score,
            open_source_portfolio=open_source_score,
        ),
        extracted_evidence=extracted_items,
        is_mock=True,
    )


# GitHub API Caller

async def fetch_github_repo_context(redacted_resume: str) -> str:
    import requests
    import asyncio
    
    github_urls = set(re.findall(r"https?://(?:www\.)?github\.com/[a-zA-Z0-9-]+/[a-zA-Z0-9_.-]+", redacted_resume))
    if not github_urls:
        return "No GitHub repository links found in the resume."
        
    context_blocks = []
    
    def fetch_repo(url):
        # Extract owner/repo
        parts = url.split("github.com/")[-1].split("/")
        if len(parts) < 2: return None
        owner, repo = parts[0], parts[1]
        repo = repo.replace(".git", "")
        
        api_url = f"https://api.github.com/repos/{owner}/{repo}"
        lang_url = f"https://api.github.com/repos/{owner}/{repo}/languages"
        try:
            resp = requests.get(api_url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                
                # Fetch detailed language breakdown
                languages_str = data.get('language', 'N/A')
                lang_resp = requests.get(lang_url, timeout=5)
                if lang_resp.status_code == 200:
                    lang_data = lang_resp.json()
                    if lang_data:
                        languages_str = ", ".join(lang_data.keys())
                
                return (
                    f"Repository: {url}\n"
                    f"Description: {data.get('description', 'N/A')}\n"
                    f"Languages Used: {languages_str}\n"
                    f"Stars: {data.get('stargazers_count', 0)}\n"
                    f"Forks: {data.get('forks_count', 0)}\n"
                )
        except Exception:
            pass
        return None

    # Fetch concurrently
    results = await asyncio.gather(*(asyncio.to_thread(fetch_repo, url) for url in github_urls))
    valid_results = [r for r in results if r]
    
    if not valid_results:
        return "Failed to fetch repository metadata (possibly private, invalid, or rate limited)."
        
    return "\n\n".join(valid_results)


async def _call_gemini(
    redacted_resume: str,
    job_description: str,
    candidate_id: str,
    api_key: str,
) -> Optional[EvidenceResult]:
    try:
        import requests
        import asyncio
        
        github_context = await fetch_github_repo_context(redacted_resume)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{os.environ.get('GEMINI_MODEL', 'gemini-3.6-flash')}:generateContent?key={api_key}"
        
        user_content = (
            f"Candidate ID: {candidate_id}\n\n"
            f"--- JOB DESCRIPTION ---\n{job_description}\n\n"
            f"--- FETCHED GITHUB PORTFOLIO METADATA ---\n{github_context}\n\n"
            f"--- REDACTED RESUME (BLIND AUDITION) ---\n{redacted_resume}"
        )
        
        payload = {
            "system_instruction": {
                "parts": {"text": EVIDENCE_PROMPT_SYSTEM}
            },
            "contents": [{
                "parts": [{"text": user_content}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1
            }
        }
        
        headers = {"Content-Type": "application/json"}
        
        def call_api():
            return requests.post(url, json=payload, headers=headers, timeout=30)
            
        response = await asyncio.to_thread(call_api)
        response.raise_for_status()
        resp_json = response.json()
        
        # Extract text from the Gemini response structure
        raw_json = "{}"
        if "candidates" in resp_json and len(resp_json["candidates"]) > 0:
            if "content" in resp_json["candidates"][0]:
                parts = resp_json["candidates"][0]["content"].get("parts", [])
                if parts:
                    raw_json = parts[0].get("text", "{}")

        data = json.loads(_clean_json_text(raw_json))

        # Validate with Pydantic
        breakdown = data.get("criteria_breakdown", {})
        crit = CriteriaBreakdown(
            technical_skills=float(breakdown.get("technical_skills", 50.0)),
            project_experience=float(breakdown.get("project_experience", 50.0)),
            domain_experience=float(breakdown.get("domain_experience", 50.0)),
            measurable_outcomes=float(breakdown.get("measurable_outcomes", 50.0)),
            open_source_portfolio=float(breakdown.get("open_source_portfolio", 50.0)),
        )

        # Recalculate or enforce weighted score
        calculated_score = round(
            0.30 * crit.technical_skills
            + 0.25 * crit.project_experience
            + 0.15 * crit.domain_experience
            + 0.15 * crit.measurable_outcomes
            + 0.15 * crit.open_source_portfolio,
            1,
        )
        score = float(data.get("evidence_score", calculated_score))

        evidence_items: List[ExtractedEvidenceItem] = []
        for item in data.get("extracted_evidence", []):
            evidence_items.append(
                ExtractedEvidenceItem(
                    skill=str(item.get("skill", "General")),
                    evidence_quote=str(item.get("evidence_quote", "No evidence provided")),
                    confidence=float(item.get("confidence", 0.5)),
                )
            )

        return EvidenceResult(
            candidate_id=candidate_id,
            evidence_score=score,
            rationale=str(data.get("rationale", "Evidence extracted via Gemini analysis.")),
            criteria_breakdown=crit,
            extracted_evidence=evidence_items,
            is_mock=False,
        )
    except Exception as exc:
        print(f"[EvidenceExtractor] Gemini call failed, falling back to mock: {exc}")
        return None


# Primary Public Dispatcher


async def extract_and_score_evidence(
    redacted_resume: str,
    job_description: str,
    candidate_id: str,
) -> EvidenceResult:
    """
    Main entrypoint: extracts evidence and computes criteria scores.
    Tries Gemini API -> High-Fidelity Heuristic Mock.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")

    if gemini_key and gemini_key.strip():
        result = await _call_gemini(redacted_resume, job_description, candidate_id, gemini_key.strip())
        if result:
            return result

    # Default fallback
    return _mock_extract_and_score(redacted_resume, job_description, candidate_id)
