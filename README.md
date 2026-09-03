# Bias-Aware Resume Screener — Phase 1

A working prototype that accepts multiple PDF/DOCX resumes plus a job
description, parses resume text on the backend, runs a basic keyword ATS
matching algorithm, and shows a ranked candidate shortlist on a React
frontend.

## Project structure

```
bias-aware-resume-screener/
├── backend/
│   ├── main.py           # FastAPI app + /api/upload-and-score endpoint
│   ├── resume_parser.py  # PDF/DOCX text extraction
│   ├── ats_scorer.py     # Keyword extraction + scoring
│   └── requirements.txt
└── frontend/
    ├── package.json
    ├── tailwind.config.js
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── types.ts
        ├── api.ts
        └── components/
            ├── JobDescriptionInput.tsx
            ├── ResumeUploader.tsx
            └── CandidateTable.tsx
```

## Run the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/hactivate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be live at `http://localhost:8000`. Interactive docs are at
`http://localhost:8000/docs`.

## Run the frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional — defaults to http://localhost:8000 anyway
npm run dev
```

The app will be live at `http://localhost:5173`.

## Using it

1. Paste a job description into the left panel.
2. Drag and drop (or browse for) one or more `.pdf`/`.docx` resumes.
3. Click **Analyze Resumes**.
4. Review the ranked shortlist: match %, matched keywords, and word count
   per candidate.

## How the Phase 1 scoring works

- The job description is tokenized, common stopwords are filtered out, and
  the top 25 most frequent remaining terms become the "job keywords."
- Each resume is checked for whole-word (case-insensitive) matches against
  that keyword list.
- Score = `(matched keywords / total keywords) × 100`, rounded to 1 decimal.

This is intentionally simple and fully transparent — every score is
traceable to a visible list of matched/unmatched keywords, which will make
it easier to audit for bias in later phases (e.g. checking whether
scoring is being driven by demographic-correlated proxies rather than
actual job-relevant skills).

## Known Phase 1 limitations (by design — future phases)

- No fairness/bias auditing yet — pure keyword ATS matching only.
- No persistent database — results live in memory for the current backend
  process (cleared on restart).
- No PII redaction or name-blind scoring yet.
- No synonym/stemming support (e.g. "manage" vs. "management" are treated
  as different tokens).
