"""
create_sample_resumes.py

Utility to generate realistic sample resume files (.docx) for testing Phase 2.
Demonstrates:
- Bias mitigation (Blind audition stripping names, top universities, graduation dates)
- Evidence surge (Candidate with strong proof jumping above keyword-heavy resumes)
"""

import os
from docx import Document

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "sample_resumes")
os.makedirs(OUTPUT_DIR, exist_ok=True)

SAMPLES = [
    (
        "alex_rivera_lead_dev.docx",
        """Alex Rivera
Email: alex.rivera@techmail.io | Phone: (415) 555-0199
Location: Portland, Oregon | Portfolio: https://alexrivera.dev
B.S. Computer Science from Portland State University (2016-2020)

Professional Summary:
Full-Stack Software Engineer with 4+ years of hands-on experience building distributed web applications, high-concurrency RESTful APIs, and responsive React frontend systems.

Work Experience:
Senior Full-Stack Developer | CloudScale Solutions (2020 - Present)
• Built a three-tab analytics dashboard using React, TypeScript, and TailwindCSS deployed to 40,000 active enterprise users.
• Architected backend microservices in Python using FastAPI and PostgreSQL, handling over 6,500 req/s with 99.95% uptime.
• Optimized database indexing and query execution plans, reducing p99 API latencies by 42% (from 380ms down to 220ms).
• Containerized backend applications with Docker and established automated CI/CD pipelines deploying to AWS ECS with zero-downtime rolling updates.
• Integrated Redis distributed caching layer to reduce hot-path database load by 60%.

Technical Competencies:
Languages & Frameworks: Python, FastAPI, React, TypeScript, JavaScript, SQL, PostgreSQL, Node.js
DevOps & Cloud: Docker, AWS (ECS, S3, RDS), CI/CD, Redis, Git, Linux
"""
    ),
    (
        "bradford_sterling_ivy_league.docx",
        """Bradford Sterling III
Email: b.sterling@alumni.stanford.edu | Phone: +1 (650) 555-8833
B.S. & M.S. in Computer Science from Stanford University (2015-2019)
LinkedIn: linkedin.com/in/bsterling-ivy

Skills & Buzzwords:
React, TypeScript, Python, FastAPI, PostgreSQL, Docker, CI/CD, Microservices, Cloud Architecture, AWS, GCP, Redis, SQL, Kubernetes, Distributed Systems, Machine Learning, Agile, Scrum, Leadership, Innovation, Scalability, Optimization, Full-Stack Development.

Professional Experience:
Technology Consultant | Global Apex Consulting (2019 - Present)
• Worked with enterprise clients on web applications using modern JavaScript and TypeScript.
• Familiar with Python and backend frameworks including FastAPI and Django.
• Assisted in database maintenance and SQL query writing.
• Participated in daily standups and agile sprint meetings.
• Exposed to Docker container workflows and cloud services.
"""
    ),
    (
        "priya_sharma_hidden_gem.docx",
        """Priya Sharma
Email: priya.sharma@gmail.com | Phone: +91 98765 43210
B.Tech in Information Technology from NIT Trichy (2017-2021)
GitHub: github.com/priyasharma-code | Website: https://priya.codes

Summary:
Results-driven Full-Stack Engineer who specializes in building resilient backend services in Python (FastAPI) and clean UI interfaces in React and TypeScript.

Engineering Experience:
Software Engineer | FinFlow Technologies (2021 - Present)
• Designed and developed core financial transaction processing engine using FastAPI and PostgreSQL, processing $2.5M in daily transactions.
• Built an interactive merchant reconciliation interface in React and TypeScript with real-time WebSocket notifications.
• Automated testing suite achieving 92% code coverage, reducing production regression bugs by 55%.
• Deployed microservices using Docker containers across Kubernetes clusters with automated GitHub Actions CI/CD pipelines.
• Spearheaded database migration to PostgreSQL partitioned tables, cutting report generation time from 15 minutes to 45 seconds.

Key Skills:
Python, FastAPI, React, TypeScript, PostgreSQL, Docker, Redis, RESTful APIs, CI/CD, Unit Testing
"""
    ),
    (
        "marcus_vance_systems_architect.docx",
        """Marcus Vance
Email: marcus.vance@techcore.org | Phone: (206) 555-7721
Address: 742 Evergreen Terrace, Seattle, WA 98101
B.S. Computer Engineering from University of Washington (2014-2018)

Executive Profile:
Full-Stack & Systems Engineer with extensive background in scalable microservice architectures, API gateways, and enterprise React applications.

Career History:
Staff Software Engineer | Nexus Infrastructure (2018 - Present)
• Led engineering team of 6 engineers to re-architect legacy monolith into FastAPI microservices, scaling system throughput by 4x.
• Implemented responsive React frontend dashboards using modern state management and TypeScript for 120,000 monthly active users.
• Engineered PostgreSQL relational data layer with connection pooling, scaling to support 15,000 concurrent database sessions.
• Configured Docker build optimization and multi-stage Dockerfiles, cutting CI/CD build and deployment duration by 65%.
• Established SLA monitoring and observability dashboards maintaining 99.99% service availability.
"""
    ),
]

for filename, content in SAMPLES:
    path = os.path.join(OUTPUT_DIR, filename)
    doc = Document()
    for line in content.strip().split("\n"):
        doc.add_paragraph(line)
    doc.save(path)
    print(f"Generated sample resume: {path}")

print("\nAll sample resumes generated successfully in sample_resumes/ directory!")
