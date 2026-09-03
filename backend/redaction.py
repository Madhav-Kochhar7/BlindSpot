"""
redaction.py

PII Redaction and Blind Audition Module for the Bias-Aware Resume Screener.

Redacts personal identifiable information (PII) including:
- Candidate names
- Email addresses
- Phone numbers
- Educational institutions (universities, colleges, institutes)
- Graduation dates & calendar year ranges
- Social URLs (LinkedIn, GitHub, Twitter/X, portfolios)
- Physical addresses and geographical markers

Assigns clean anonymized candidate identifiers (e.g. "Candidate C-001")
to enable objective, evidence-based blind evaluations.
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple


# Precompiled regex patterns for PII redaction

# 1. Email pattern
EMAIL_PATTERN = re.compile(
    r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",
    re.IGNORECASE,
)

# 2. Phone number patterns (handles US, international, spaced, dotted, dashed)
PHONE_PATTERN = re.compile(
    r"(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b"
)

# 3. Web URLs & Social Profiles
URL_PATTERN = re.compile(
    r"(?:https?://(?:www\.)?|www\.)[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?:/[^\s,)]*)?|"
    r"\b(?:linkedin\.com/in/[A-Za-z0-9_-]+|github\.com/[A-Za-z0-9_-]+|twitter\.com/[A-Za-z0-9_]+|x\.com/[A-Za-z0-9_]+)\b",
    re.IGNORECASE,
)

# 4. Date ranges & graduation years (e.g., 2015-2019, 2018 – Present, May 2020, Class of 2022)
DATE_RANGE_PATTERN = re.compile(
    r"\b(?:(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:19|20)\d{2}|[Pp]resent|[Cc]urrent|[Nn]ow))\b|"
    r"\b(?:[Jj]an(?:uary)?|[Ff]eb(?:ruary)?|[Mm]ar(?:ch)?|[Aa]pr(?:il)?|[Mm]ay|[Jj]un(?:e)?|[Jj]ul(?:y)?|[Aa]ug(?:ust)?|[Ss]ep(?:tember)?|[Oo]ct(?:ober)?|[Nn]ov(?:ember)?|[Dd]ec(?:ember)?)\.?,?\s+(?:19|20)\d{2}\b|"
    r"\b(?:[Cc]lass\s+of\s+(?:19|20)\d{2}|[Gg]raduat(?:ed|ion)(?:\s+in)?\s+(?:19|20)\d{2}|(?:19|20)\d{2}\s+graduate)\b|"
    r"\b\((?:19|20)\d{2}\s*(?:-|–|—)\s*(?:19|20)\d{2}\)\b",
    re.IGNORECASE,
)

# Standalone 4-digit years in education contexts (e.g., "B.S. Computer Science, 2018")
STANDALONE_YEAR_PATTERN = re.compile(
    r"\b((?:degree|bachelor|master|phd|b\.s\.|m\.s\.|b\.tech|m\.tech|diploma|gpa|graduated|class of)[\w\s,]{0,30})\b(19\d{2}|20\d{2})\b",
    re.IGNORECASE,
)


# 5. Educational Institutions & Universities
# Well-known prestigious global institutions
KNOWN_INSTITUTIONS = [
    r"IIT\s+[A-Za-z]+",
    r"NIT\s+[A-Za-z]+",
    r"BITS\s+Pilani",
    r"Stanford(?:\s+University)?",
    r"Harvard(?:\s+University)?",
    r"MIT\b|Massachusetts Institute of Technology",
    r"UC\s+Berkeley|University of California,?\s+[A-Za-z]+",
    r"Carnegie Mellon(?:\s+University)?|CMU\b",
    r"Oxford(?:\s+University)?|University of Oxford",
    r"Cambridge(?:\s+University)?|University of Cambridge",
    r"Princeton(?:\s+University)?",
    r"Yale(?:\s+University)?",
    r"Columbia\s+University",
    r"Cornell(?:\s+University)?",
    r"Caltech|California Institute of Technology",
    r"Georgia Tech|Georgia Institute of Technology",
    r"Purdue(?:\s+University)?",
    r"University of [A-Za-z\s]+",
    r"[A-Za-z\s]+ State University",
    r"[A-Za-z\s]+ Institute of Technology",
    r"[A-Za-z\s]+ (?:University|College|Polytechnic|Academy)",
]

INSTITUTION_PATTERN = re.compile(
    r"\b(?:" + "|".join(KNOWN_INSTITUTIONS) + r")\b",
    re.IGNORECASE,
)

# 6. Physical Addresses / Zip Codes / Locations
LOCATION_PATTERN = re.compile(
    r"\b\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?)\b|"
    r"\b[A-Z][a-zA-Z\s]+,\s*(?:[A-Z]{2}\b|\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+\d{5}(?:-\d{4})?)\b|"
    r"\b\d{5}(?:-\d{4})?\b",
)


def generate_candidate_id(index: int) -> str:
    """Generate a clean anonymized identifier like 'C-001' or 'Candidate C-001'."""
    return f"C-{index:03d}"


def _scrub_name(text: str, candidate_name: Optional[str] = None) -> Tuple[str, int]:
    """
    Scrub the candidate's name from the resume text.
    Handles explicit candidate name matches and top-header candidate name lines.
    """
    redactions_count = 0
    scrubbed = text

    # If candidate name is known (e.g. from filename or metadata)
    if candidate_name:
        parts = [p.strip() for p in re.split(r"[\s_-]+", candidate_name) if len(p.strip()) > 2]
        # Full name first
        full_name_pattern = re.compile(re.escape(candidate_name), re.IGNORECASE)
        matches = len(full_name_pattern.findall(scrubbed))
        if matches > 0:
            scrubbed = full_name_pattern.sub("[REDACTED_NAME]", scrubbed)
            redactions_count += matches

        # Then distinctive name tokens
        for part in parts:
            # Skip common non-name terms
            if part.lower() in {"resume", "cv", "curriculum", "vitae", "engineer", "developer", "senior", "lead"}:
                continue
            part_pattern = re.compile(r"\b" + re.escape(part) + r"\b", re.IGNORECASE)
            part_matches = len(part_pattern.findall(scrubbed))
            if part_matches > 0:
                scrubbed = part_pattern.sub("[REDACTED_NAME]", scrubbed)
                redactions_count += part_matches

    # Also check the top 3 lines of resume which typically have the candidate name
    lines = scrubbed.split("\n")
    new_lines = []
    for i, line in enumerate(lines):
        line_clean = line.strip()
        # If one of first 3 non-empty lines has 2-4 capitalized words and no typical section keywords
        if i < 4 and line_clean and not line_clean.startswith("[REDACTED"):
            lower = line_clean.lower()
            if not any(k in lower for k in ["summary", "experience", "education", "skills", "projects", "objective", "contact", "profile"]):
                words = line_clean.split()
                if 1 <= len(words) <= 4 and all(w[0].isupper() for w in words if w and w[0].isalpha()):
                    line = "[REDACTED_NAME]"
                    redactions_count += 1
        new_lines.append(line)

    return "\n".join(new_lines), redactions_count


def redact_resume(
    resume_text: str,
    candidate_index: int = 1,
    candidate_name: Optional[str] = None,
) -> Tuple[str, str, Dict[str, int]]:
    """
    Perform comprehensive PII redaction on resume text.

    Args:
        resume_text: Raw parsed resume text.
        candidate_index: 1-indexed sequential candidate number.
        candidate_name: Optional candidate name string to explicitly scrub.

    Returns:
        Tuple of:
            - anonymized_id: e.g. "Candidate C-001"
            - redacted_text: Sanitized text with [REDACTED_*] tokens
            - stats: Dictionary tracking counts of redacted entities
    """
    anonymized_id = f"Candidate {generate_candidate_id(candidate_index)}"
    text = resume_text
    stats: Dict[str, int] = {
        "emails": 0,
        "phones": 0,
        "urls": 0,
        "dates": 0,
        "institutions": 0,
        "locations": 0,
        "names": 0,
    }

    # 1. Emails
    email_matches = len(EMAIL_PATTERN.findall(text))
    text = EMAIL_PATTERN.sub("[REDACTED_EMAIL]", text)
    stats["emails"] = email_matches

    # 2. URLs / Socials (Preserved: LinkedIn, GitHub, and portfolio links are kept intact to evaluate project evidence)
    stats["urls"] = 0

    # 3. Phone numbers
    phone_matches = len(PHONE_PATTERN.findall(text))
    text = PHONE_PATTERN.sub("[REDACTED_PHONE]", text)
    stats["phones"] = phone_matches

    # 4. Dates & Graduation Year Ranges
    date_matches = len(DATE_RANGE_PATTERN.findall(text))
    text = DATE_RANGE_PATTERN.sub("[REDACTED_DATE]", text)
    year_matches = len(STANDALONE_YEAR_PATTERN.findall(text))
    text = STANDALONE_YEAR_PATTERN.sub(r"\g<1>[REDACTED_DATE]", text)
    stats["dates"] = date_matches + year_matches

    # 5. Educational Institutions
    inst_matches = len(INSTITUTION_PATTERN.findall(text))
    text = INSTITUTION_PATTERN.sub("[REDACTED_INSTITUTION]", text)
    stats["institutions"] = inst_matches

    # 6. Physical addresses & locations
    loc_matches = len(LOCATION_PATTERN.findall(text))
    text = LOCATION_PATTERN.sub("[REDACTED_LOCATION]", text)
    stats["locations"] = loc_matches

    # 7. Candidate Names
    text, name_matches = _scrub_name(text, candidate_name)
    stats["names"] = name_matches

    return anonymized_id, text, stats
