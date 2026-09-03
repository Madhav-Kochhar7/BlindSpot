const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function uploadAndScore(jobDescription, files) {
  const formData = new FormData();
  formData.append("job_description", jobDescription);
  files.forEach((file) => formData.append("resumes", file));

  const response = await fetch(`${API_BASE_URL}/api/upload-and-score`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body.detail)
      .catch(() => null);
    throw new Error(detail ?? `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function getDemographicsSummary() {
  const response = await fetch(`${API_BASE_URL}/api/demographics`);
  if (!response.ok) {
    throw new Error(`Failed to fetch demographics summary: ${response.status}`);
  }
  return response.json();
}

export async function uploadDemographics(file, generateDemo = false) {
  const formData = new FormData();
  if (generateDemo) {
    formData.append("generate_demo", "true");
  } else if (file) {
    formData.append("file", file);
  } else {
    throw new Error("Either a CSV file or generateDemo=true must be provided.");
  }

  const response = await fetch(`${API_BASE_URL}/api/demographics/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body.detail)
      .catch(() => null);
    throw new Error(detail ?? `Demographic upload failed: ${response.status}`);
  }

  return response.json();
}

export async function runBiasAudit(shortlistSize = 5) {
  const response = await fetch(`${API_BASE_URL}/api/audit/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ shortlist_size: shortlistSize }),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body.detail)
      .catch(() => null);
    throw new Error(
      detail ?? `Bias audit calculation failed: ${response.status}`,
    );
  }

  return response.json();
}

// Phase 4: HR Review & Governance API Helpers

export async function submitHRDecision(
  candidateId,
  decision,
  overrideReason,
  reviewerName = "HR Recruiter",
) {
  const response = await fetch(`${API_BASE_URL}/api/decisions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      candidate_id: candidateId,
      decision: decision,
      override_reason: overrideReason,
      reviewer_name: reviewerName,
    }),
  });

  if (!response.ok) {
    const detail = await response
      .json()
      .then((body) => body.detail)
      .catch(() => null);
    throw new Error(detail ?? `Failed to save decision: ${response.status}`);
  }

  return response.json();
}

export async function getHRDecisionsSummary() {
  const response = await fetch(`${API_BASE_URL}/api/decisions/summary`);
  if (!response.ok) {
    throw new Error(`Failed to fetch HR decision summary: ${response.status}`);
  }
  return response.json();
}

export async function exportAuditReportJSON() {
  const response = await fetch(
    `${API_BASE_URL}/api/export/audit-report?format=json`,
  );
  if (!response.ok) {
    throw new Error(`Failed to export audit report: ${response.status}`);
  }
  return response.json();
}

export async function exportAuditReportCSV() {
  const response = await fetch(
    `${API_BASE_URL}/api/export/audit-report?format=csv`,
  );
  if (!response.ok) {
    throw new Error(`Failed to export audit report CSV: ${response.status}`);
  }
  return response.blob();
}

export async function exportAuditReportPDF() {
  const response = await fetch(
    `${API_BASE_URL}/api/export/audit-report?format=pdf`,
  );
  if (!response.ok) {
    throw new Error(`Failed to export audit report PDF: ${response.status}`);
  }
  return response.blob();
}

export async function resetSession() {
  const response = await fetch(`${API_BASE_URL}/api/reset`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to reset session: ${response.status}`);
  }
  return response.json();
}
