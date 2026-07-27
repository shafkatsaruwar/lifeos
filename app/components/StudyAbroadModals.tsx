"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  University,
  Program,
  StudyDocument,
} from "@/lib/studyAbroadTypes";

export function UniversityModal({
  university,
  close,
  save,
}: {
  university?: University;
  close: () => void;
  save: (university: University) => void;
}) {
  const [name, setName] = useState(university?.name ?? "");
  const [country, setCountry] = useState(university?.country ?? "Germany");
  const [city, setCity] = useState(university?.city ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(university?.websiteUrl ?? "");
  const [applicationPortalUrl, setApplicationPortalUrl] = useState(university?.applicationPortalUrl ?? "");
  const [universityType, setUniversityType] = useState(university?.universityType ?? "public");
  const [notes, setNotes] = useState(university?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const newUniversity: University = {
      id: university?.id ?? `uni-${Date.now()}`,
      name: name.trim(),
      country: country as any,
      city: city.trim() || undefined,
      websiteUrl: websiteUrl.trim() || undefined,
      applicationPortalUrl: applicationPortalUrl.trim() || undefined,
      universityType: universityType as any,
      notes: notes.trim() || undefined,
      createdAt: university?.createdAt ?? now,
      updatedAt: now,
    };

    save(newUniversity);
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{university ? "Edit University" : "Add University"}</h2>
            <p>Record university information and application details.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>
        <label>
          University Name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Technical University of Munich" required />
        </label>
        <label>
          Country
          <select value={country} onChange={(e) => setCountry(e.target.value as any)}>
            <option>Germany</option>
            <option>Netherlands</option>
            <option>Sweden</option>
            <option>Finland</option>
            <option>United Kingdom</option>
            <option>Other</option>
          </select>
        </label>
        <label>
          City
          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
        </label>
        <label>
          Website URL
          <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
        </label>
        <label>
          Application Portal URL
          <input type="url" value={applicationPortalUrl} onChange={(e) => setApplicationPortalUrl(e.target.value)} placeholder="https://" />
        </label>
        <label>
          Type
          <select value={universityType} onChange={(e) => setUniversityType(e.target.value as any)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional information..." style={{ minHeight: "80px" }} />
        </label>
        <div>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!name.trim()}>
            Save University
          </button>
        </div>
      </form>
    </div>
  );
}

export function ProgramModal({
  program,
  university,
  close,
  save,
}: {
  program?: Program;
  university?: University;
  close: () => void;
  save: (program: Program) => void;
}) {
  const [name, setName] = useState(program?.name ?? "");
  const [degreeType, setDegreeType] = useState(program?.degreeType ?? "MSc");
  const [field, setField] = useState(program?.field ?? "Digital Health");
  const [teachingLanguage, setTeachingLanguage] = useState(program?.teachingLanguage ?? "English");
  const [intake, setIntake] = useState(program?.intake ?? "");
  const [durationMonths, setDurationMonths] = useState(program?.durationMonths ?? 24);
  const [tuitionAmount, setTuitionAmount] = useState(program?.tuitionAmount?.toString() ?? "");
  const [tuitionCurrency, setTuitionCurrency] = useState(program?.tuitionCurrency ?? "EUR");
  const [tuitionFrequency, setTuitionFrequency] = useState(program?.tuitionFrequency ?? "total");
  const [tuitionNotes, setTuitionNotes] = useState(program?.tuitionNotes ?? "");
  const [livingCostMin, setLivingCostMin] = useState(program?.estimatedMonthlyLivingCostMin?.toString() ?? "");
  const [livingCostMax, setLivingCostMax] = useState(program?.estimatedMonthlyLivingCostMax?.toString() ?? "");
  const [livingCostCurrency, setLivingCostCurrency] = useState(program?.livingCostCurrency ?? "EUR");
  const [applicationDeadline, setApplicationDeadline] = useState(program?.applicationDeadline ?? "");
  const [scholarshipDeadline, setScholarshipDeadline] = useState(program?.scholarshipDeadline ?? "");
  const [applicationStatus, setApplicationStatus] = useState(program?.applicationStatus ?? "researching");
  const [confidence, setConfidence] = useState(program?.confidence ?? "unverified");
  const [eligibilityNotes, setEligibilityNotes] = useState(program?.eligibilityNotes ?? "");
  const [sourceUrl, setSourceUrl] = useState(program?.sourceUrls?.[0] ?? "");
  const [notes, setNotes] = useState(program?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !university) return;

    const now = new Date().toISOString();
    const newProgram: Program = {
      id: program?.id ?? `prog-${Date.now()}`,
      universityId: university.id,
      name: name.trim(),
      degreeType: degreeType as any,
      field: field as any,
      teachingLanguage: teachingLanguage.trim() || undefined,
      intake: intake.trim() || undefined,
      durationMonths: durationMonths ? parseInt(durationMonths.toString()) : undefined,
      tuitionAmount: tuitionAmount ? parseFloat(tuitionAmount) : undefined,
      tuitionCurrency: tuitionCurrency.trim() || undefined,
      tuitionFrequency: tuitionFrequency as any,
      tuitionNotes: tuitionNotes.trim() || undefined,
      estimatedMonthlyLivingCostMin: livingCostMin ? parseFloat(livingCostMin) : undefined,
      estimatedMonthlyLivingCostMax: livingCostMax ? parseFloat(livingCostMax) : undefined,
      livingCostCurrency: livingCostCurrency.trim() || undefined,
      applicationDeadline: applicationDeadline || undefined,
      scholarshipDeadline: scholarshipDeadline || undefined,
      applicationStatus: applicationStatus as any,
      confidence: confidence as any,
      eligibilityNotes: eligibilityNotes.trim() || undefined,
      sourceUrls: sourceUrl.trim() ? [sourceUrl.trim()] : undefined,
      notes: notes.trim() || undefined,
      createdAt: program?.createdAt ?? now,
      updatedAt: now,
    };

    save(newProgram);
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{program ? "Edit Program" : "Add Program"}</h2>
            <p>Program details and application requirements.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <div className="study-form-section">
          <h3>Basic Info</h3>
          <div className="study-form-grid">
            <label>
              Program Name
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., MSc Digital Health" required />
            </label>
            <label>
              Degree Type
              <select value={degreeType} onChange={(e) => setDegreeType(e.target.value as any)}>
                <option>MSc</option>
                <option>MA</option>
                <option>MEng</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Field
              <select value={field} onChange={(e) => setField(e.target.value as any)}>
                <option>Digital Health</option>
                <option>Health Informatics</option>
                <option>Artificial Intelligence</option>
                <option>Computer Science</option>
                <option>Cybersecurity</option>
                <option>Information Systems</option>
                <option>Data Science</option>
                <option>Other</option>
              </select>
            </label>
            <label>
              Teaching Language
              <input value={teachingLanguage} onChange={(e) => setTeachingLanguage(e.target.value)} placeholder="e.g., English" />
            </label>
            <label>
              Intake
              <input value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="e.g., Winter Semester 2026/27" />
            </label>
            <label>
              Duration (months)
              <input type="number" value={durationMonths} onChange={(e) => setDurationMonths(parseInt(e.target.value))} min="1" max="120" />
            </label>
          </div>
        </div>

        <div className="study-form-section">
          <h3>Tuition</h3>
          <div className="study-form-grid">
            <label>
              Amount
              <input type="number" value={tuitionAmount} onChange={(e) => setTuitionAmount(e.target.value)} step="100" placeholder="e.g., 14000" />
            </label>
            <label>
              Currency
              <input value={tuitionCurrency} onChange={(e) => setTuitionCurrency(e.target.value)} placeholder="EUR" />
            </label>
            <label>
              Frequency
              <select value={tuitionFrequency} onChange={(e) => setTuitionFrequency(e.target.value as any)}>
                <option value="total">Total</option>
                <option value="annual">Annual</option>
                <option value="semester">Per semester</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
          <label>
            Tuition Notes
            <textarea value={tuitionNotes} onChange={(e) => setTuitionNotes(e.target.value)} placeholder="e.g., Includes fees, may be waived for scholarship holders" style={{ minHeight: "60px" }} />
          </label>
        </div>

        <div className="study-form-section">
          <h3>Living Costs (Monthly Estimate)</h3>
          <div className="study-form-grid">
            <label>
              Min
              <input type="number" value={livingCostMin} onChange={(e) => setLivingCostMin(e.target.value)} step="100" placeholder="e.g., 1000" />
            </label>
            <label>
              Max
              <input type="number" value={livingCostMax} onChange={(e) => setLivingCostMax(e.target.value)} step="100" placeholder="e.g., 1500" />
            </label>
            <label>
              Currency
              <input value={livingCostCurrency} onChange={(e) => setLivingCostCurrency(e.target.value)} placeholder="EUR" />
            </label>
          </div>
        </div>

        <div className="study-form-section">
          <h3>Deadlines & Status</h3>
          <div className="study-form-grid">
            <label>
              Application Deadline
              <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} />
            </label>
            <label>
              Scholarship Deadline
              <input type="date" value={scholarshipDeadline} onChange={(e) => setScholarshipDeadline(e.target.value)} />
            </label>
            <label>
              Status
              <select value={applicationStatus} onChange={(e) => setApplicationStatus(e.target.value as any)}>
                <option>researching</option>
                <option>considering</option>
                <option>preparing</option>
                <option>blocked</option>
                <option>ready_to_submit</option>
                <option>submitted</option>
                <option>awaiting_response</option>
                <option>interview</option>
                <option>offer</option>
                <option>rejected</option>
                <option>withdrawn</option>
                <option>deferred</option>
              </select>
            </label>
            <label>
              Confidence
              <select value={confidence} onChange={(e) => setConfidence(e.target.value as any)}>
                <option value="unverified">Unverified</option>
                <option value="partially_verified">Partially verified</option>
                <option value="verified">Verified</option>
              </select>
            </label>
          </div>
        </div>

        <label>
          Eligibility Notes
          <textarea value={eligibilityNotes} onChange={(e) => setEligibilityNotes(e.target.value)} placeholder="Requirements you've checked" style={{ minHeight: "60px" }} />
        </label>

        <label>
          Source URL
          <input type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional information..." style={{ minHeight: "60px" }} />
        </label>

        <div>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!name.trim()}>
            Save Program
          </button>
        </div>
      </form>
    </div>
  );
}

export function DocumentModal({
  document,
  close,
  save,
}: {
  document?: StudyDocument;
  close: () => void;
  save: (document: StudyDocument) => void;
}) {
  const [name, setName] = useState(document?.name ?? "");
  const [category, setCategory] = useState(document?.category ?? "Diploma");
  const [status, setStatus] = useState(document?.status ?? "available");
  const [issuedBy, setIssuedBy] = useState(document?.issuedBy ?? "");
  const [issueDate, setIssueDate] = useState(document?.issueDate ?? "");
  const [expirationDate, setExpirationDate] = useState(document?.expirationDate ?? "");
  const [blockingReason, setBlockingReason] = useState(document?.blockingReason ?? "");
  const [amountNeeded, setAmountNeeded] = useState(document?.amountNeededToResolve?.toString() ?? "");
  const [currency, setCurrency] = useState(document?.currency ?? "USD");
  const [notes, setNotes] = useState(document?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const newDocument: StudyDocument = {
      id: document?.id ?? `doc-${Date.now()}`,
      name: name.trim(),
      category: category as any,
      status: status as any,
      issuedBy: issuedBy.trim() || undefined,
      issueDate: issueDate || undefined,
      expirationDate: expirationDate || undefined,
      blockingReason: blockingReason.trim() || undefined,
      amountNeededToResolve: amountNeeded ? parseFloat(amountNeeded) : undefined,
      currency: currency.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: document?.createdAt ?? now,
      updatedAt: now,
    };

    save(newDocument);
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{document ? "Edit Document" : "Add Document"}</h2>
            <p>Track important documents needed for applications.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <label>
          Document Name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., UMass Boston Diploma" required />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
            <option>Diploma</option>
            <option>Transcript</option>
            <option>Passport</option>
            <option>Resume</option>
            <option>Statement of Purpose</option>
            <option>Recommendation Letter</option>
            <option>English Test</option>
            <option>Financial Document</option>
            <option>Application Decision</option>
            <option>Other</option>
          </select>
        </label>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="available">Available</option>
            <option value="requested">Requested</option>
            <option value="pending">Pending</option>
            <option value="blocked">Blocked</option>
            <option value="expired">Expired</option>
            <option value="not_available">Not available</option>
          </select>
        </label>

        {status === "blocked" && (
          <>
            <label>
              Blocking Reason
              <textarea value={blockingReason} onChange={(e) => setBlockingReason(e.target.value)} placeholder="Why is this blocked?" style={{ minHeight: "60px" }} />
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <label>
                Amount Needed to Resolve
                <input type="number" value={amountNeeded} onChange={(e) => setAmountNeeded(e.target.value)} step="10" placeholder="e.g., 1200" />
              </label>
              <label>
                Currency
                <input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="USD" />
              </label>
            </div>
          </>
        )}

        <label>
          Issued By
          <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder="e.g., University of Massachusetts Boston" />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            Issue Date
            <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </label>
          <label>
            Expiration Date
            <input type="date" value={expirationDate} onChange={(e) => setExpirationDate(e.target.value)} />
          </label>
        </div>

        <label>
          Upload File
          <input type="file" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setNotes(prev => prev + (prev ? '\n' : '') + `Uploaded: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
            }
          }} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" />
          <small>Supports PDF, DOC, DOCX, TXT, JPG, PNG</small>
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional information..." style={{ minHeight: "60px" }} />
        </label>

        <div>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!name.trim()}>
            Save Document
          </button>
        </div>
      </form>
    </div>
  );
}

export function StudyAbroadCollectionView({
  type,
  items,
  close,
  onAdd,
  onEdit,
  onDelete,
  hub,
}: {
  type: "universities" | "programs" | "applications" | "scholarships" | "documents";
  items: any[];
  close: () => void;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string) => void;
  hub: any;
}) {
  const getIcon = () => {
    switch (type) {
      case "universities": return "🏫";
      case "programs": return "📚";
      case "applications": return "📝";
      case "scholarships": return "🎓";
      case "documents": return "📄";
    }
  };

  const getTitle = () => {
    switch (type) {
      case "universities": return "Universities";
      case "programs": return "Programs";
      case "applications": return "Applications";
      case "scholarships": return "Scholarships";
      case "documents": return "Documents";
    }
  };

  const renderItem = (item: any) => {
    switch (type) {
      case "universities":
        return (
          <div className="collection-item">
            <div className="item-header">
              <strong>{item.name}</strong>
              <span className="item-meta">{item.country}</span>
            </div>
            {item.city && <p className="item-detail">{item.city}</p>}
            {item.notes && <p className="item-detail">{item.notes}</p>}
          </div>
        );
      case "programs":
        const uni = hub.universities.find((u: any) => u.id === item.universityId);
        return (
          <div className="collection-item">
            <div className="item-header">
              <strong>{item.name}</strong>
              <span className="item-meta">{item.degreeType || "Unknown"}</span>
            </div>
            <p className="item-detail">{uni?.name}</p>
            {item.field && <p className="item-detail">{item.field}</p>}
            <p className="item-detail" style={{ color: "#666" }}>{item.applicationStatus}</p>
          </div>
        );
      case "applications":
        const prog = hub.programs.find((p: any) => p.id === item.programId);
        const appUni = hub.universities.find((u: any) => u.id === item.universityId);
        return (
          <div className="collection-item">
            <div className="item-header">
              <strong>{appUni?.name} - {prog?.name}</strong>
              <span className="item-meta">{item.status}</span>
            </div>
            {item.applicantNumber && <p className="item-detail">Applicant #: {item.applicantNumber}</p>}
            {item.dateSubmitted && <p className="item-detail">Submitted: {new Date(item.dateSubmitted).toLocaleDateString()}</p>}
          </div>
        );
      case "scholarships":
        return (
          <div className="collection-item">
            <div className="item-header">
              <strong>{item.name}</strong>
              <span className="item-meta">{item.status}</span>
            </div>
            {item.provider && <p className="item-detail">{item.provider}</p>}
            {item.stipendAmount && <p className="item-detail">{item.stipendCurrency || "EUR"} {item.stipendAmount}</p>}
          </div>
        );
      case "documents":
        return (
          <div className="collection-item">
            <div className="item-header">
              <strong>{item.name}</strong>
              <span className={`item-meta status-${item.status}`}>{item.status}</span>
            </div>
            <p className="item-detail">{item.category}</p>
            {item.blockingReason && <p className="item-detail" style={{ color: "#ef4444" }}>{item.blockingReason}</p>}
            {item.amountNeededToResolve && <p className="item-detail" style={{ color: "#ef4444" }}>{item.currency || "EUR"} {item.amountNeededToResolve} needed</p>}
          </div>
        );
    }
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "var(--bg)",
        borderRadius: "12px",
        width: "90%",
        maxWidth: "700px",
        maxHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>{getIcon()} {getTitle()}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--text-secondary)" }}>{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>
          <button onClick={close} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", padding: "4px" }}>
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {items.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                  <div style={{ flex: 1, cursor: "pointer", padding: "12px", background: "var(--card-bg)", borderRadius: "8px", border: "1px solid var(--border)" }} onClick={() => onEdit(item)}>
                    {renderItem(item)}
                  </div>
                  <button onClick={() => {
                    if (confirm(`Delete ${item.name}?`)) {
                      onDelete(item.id);
                    }
                  }} style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
              <p style={{ fontSize: "14px", margin: 0 }}>No {getTitle().toLowerCase()} yet</p>
            </div>
          )}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={close} style={{
            padding: "8px 16px",
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}>
            Close
          </button>
          <button onClick={onAdd} style={{
            padding: "8px 16px",
            background: "#625af6",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "13px",
          }}>
            + Add {getTitle().slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );
}
