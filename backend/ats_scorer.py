"""
ats_scorer.py

A basic, transparent keyword-matching ATS scorer.

Phase 1 keeps this deliberately simple and explainable: extract candidate
keywords from the job description by frequency + stopword filtering, then
check for their presence in resume text. This gives every candidate a
transparent, reproducible score and a visible list of matched keywords -
useful groundwork for later phases, where we'll want to audit *why* a
candidate was ranked the way they were.
"""

from __future__ import annotations

import re
from collections import Counter

# A reasonably broad English stopword list, plus resume/JD "noise" words that
# carry little signal for skills matching.
STOPWORDS: set[str] = {
    "a", "an", "the", "and", "or", "but", "if", "then", "so", "of", "to",
    "in", "on", "at", "by", "for", "with", "about", "as", "into", "like",
    "through", "after", "over", "between", "out", "against", "during",
    "without", "before", "under", "around", "among", "is", "are", "was",
    "were", "be", "been", "being", "have", "has", "had", "do", "does",
    "did", "will", "would", "should", "could", "can", "may", "might",
    "must", "shall", "this", "that", "these", "those", "i", "you", "he",
    "she", "it", "we", "they", "them", "his", "her", "its", "our", "their",
    "what", "which", "who", "whom", "not", "no", "yes", "up", "down",
    "off", "again", "further", "once", "here", "there", "all", "any",
    "both", "each", "few", "more", "most", "other", "some", "such",
    "only", "own", "same", "than", "too", "very", "just", "job", "role",
    "work", "years", "year", "experience", "team", "company", "candidate",
    "position", "responsibilities", "requirements", "qualifications",
    "preferred", "required", "including", "etc", "strong", "ability",
    "skills", "us", "plus", "using", "within", "across", "new", "day",
    "days", "looking", "seeking", "join", "help", "make", "get",
}

# Matches words/numbers plus common tech-token punctuation so multi-symbol
# terms like "C++", "C#", "Node.js", "CI/CD" survive tokenization intact.
TOKEN_PATTERN = re.compile(r"[A-Za-z][A-Za-z0-9+#./-]*[A-Za-z0-9+#]|[A-Za-z]")


def _tokenize(text: str) -> list[str]:
    return [tok.lower() for tok in TOKEN_PATTERN.findall(text)]


def extract_keywords(job_description: str, top_n: int = 25) -> list[str]:
    """
    Extract the top_n most frequent, non-stopword tokens from the job
    description. These become the keyword set candidates are scored against.
    """
    tokens = _tokenize(job_description)

    filtered = [
        tok for tok in tokens
        if tok not in STOPWORDS
        and len(tok) > 2
        and not tok.isdigit()
    ]

    if not filtered:
        return []

    counts = Counter(filtered)
    # Sort by frequency (desc), then alphabetically for stable, deterministic
    # ordering when frequencies tie.
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))

    return [keyword for keyword, _ in ranked[:top_n]]


def score_resume(resume_text: str, keywords: list[str]) -> tuple[float, list[str]]:
    """
    Check which keywords appear in the resume text (whole-word, case
    insensitive) and return a normalized 0-100 score plus the matched list.
    """
    if not keywords:
        return 0.0, []

    resume_lower = resume_text.lower()
    matched: list[str] = []

    for keyword in keywords:
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, resume_lower):
            matched.append(keyword)

    score = round((len(matched) / len(keywords)) * 100, 1)
    return score, matched
