# BlindSpot

**A bias-aware resume screening and HR governance platform**

BlindSpot screens technical candidates by combining PII redaction, a dual-pipeline evaluation (a traditional ATS scorer next to an evidence-based AI reviewer), live GitHub portfolio verification, and EEOC compliance auditing. The goal is to judge candidates on verifiable work instead of pedigree.

![BlindSpot Dashboard Overview](https://via.placeholder.com/1000x500.png?text=BlindSpot+Dashboard+Screenshot)

## Features

### Phase 1: PII redaction

Before evaluation, BlindSpot strips resumes of details that can trigger unconscious bias: candidate names, emails, phone numbers, and addresses; university and college names; and age indicators like graduation dates. GitHub and portfolio links stay in, since verifying real work is the point.

### Phase 2: Dual-pipeline evaluation

BlindSpot runs two scorers side by side. A traditional ATS scorer counts keyword matches against the job description. Blind Evidence AI, built on Gemini 3.6 Flash, reads the redacted resume and pulls out concrete evidence of technical skills, project complexity, domain context, and measurable outcomes.

### Phase 3: Live GitHub portfolio verification (RAG)

BlindSpot cross-checks resume claims against a candidate's actual GitHub activity. It extracts GitHub links from the resume, fetches live repository metadata (descriptions, stars, language breakdowns) via the GitHub REST API, and feeds that context into the LLM prompt so it can compare claims against real contributions.

### Phase 4: EEOC four-fifths (80%) parity audit

A compliance engine tracks the algorithm for systemic bias. It correlates anonymized selection rates against demographic data (gender, ethnicity, age) held in an isolated, governed database layer, and calculates the Adverse Impact Ratio as defined under EEOC UGESP 29 C.F.R. § 1607.4(D).

### Phase 5: HR governance and reporting

BlindSpot includes a governance console that keeps a human in the loop. Clicking any AI score shows the exact quote the LLM used to justify it. HR operators can override an AI or ATS rejection, but have to log a justification for compliance. The system can also export a landscape PDF audit report with an executive summary, parity metrics, and the full human-override audit trail.

---

## Technology stack

**Frontend (client)**
- React 18 / Vite
- Tailwind CSS (custom "Promage" aesthetic, glassmorphism)
- Lucide React icons
- Hosted on Vercel

**Backend (API and AI pipeline)**
- Python 3.11 / FastAPI
- Google Gemini API (`gemini-3.6-flash`) for LLM reasoning
- GitHub REST API for live portfolio fetching
- `reportlab` for PDF generation
- Hosted on Render

**Database and persistence**
- Isolated SQLite (`screener.db`), separating candidate evaluation data from protected demographic identity data.

---

## Local development setup

### 1. Clone the repository
```bash
git clone https://github.com/Madhav-Kochhar7/BlindSpot.git
cd BlindSpot
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up your environment variables
echo "GEMINI_API_KEY=your_google_ai_key_here" > .env

# Run the FastAPI server
uvicorn main:app --reload --port 8000 --env-file .env
```

### 3. Frontend setup
Open a new terminal window.
```bash
cd frontend
npm install

# Set up your environment variables
echo "VITE_API_URL=http://localhost:8000" > .env

# Run the Vite dev server
npm run dev
```
Then open `http://localhost:5173` in your browser.

---

## License

This project was built for Hackfest '26 organized by SAP and is open-sourced under the MIT License.