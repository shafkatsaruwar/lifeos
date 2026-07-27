"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  University,
  Program,
  StudyDocument,
  Application,
  Scholarship,
} from "@/lib/studyAbroadTypes";

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
  "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
  "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
  "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France",
  "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
  "Haiti", "Honduras", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
  "Jamaica", "Japan", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
  "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
  "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
  "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Qatar",
  "Romania", "Russia", "Rwanda",
  "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
  "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
  "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
  "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
  "Yemen",
  "Zambia", "Zimbabwe", "Other"
].sort();

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
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
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
    const renderMain = () => {
      switch (type) {
        case "universities":
          return (
            <>
              <strong>{item.name}</strong>
              <small>{item.country}{item.city ? ` · ${item.city}` : ""}</small>
            </>
          );
        case "programs":
          const uni = hub.universities.find((u: any) => u.id === item.universityId);
          return (
            <>
              <strong>{item.name}</strong>
              <small>{uni?.name} · {item.degreeType} · {item.applicationStatus}</small>
            </>
          );
        case "applications":
          const prog = hub.programs.find((p: any) => p.id === item.programId);
          const appUni = hub.universities.find((u: any) => u.id === item.universityId);
          return (
            <>
              <strong>{appUni?.name}</strong>
              <small>{prog?.name} · {item.status}</small>
            </>
          );
        case "scholarships":
          return (
            <>
              <strong>{item.name}</strong>
              <small>{item.provider || "Unknown"} · {item.status}</small>
            </>
          );
        case "documents":
          return (
            <>
              <strong>{item.name}</strong>
              <small>{item.category} · {item.status}</small>
            </>
          );
      }
    };
    return renderMain();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <div className="hub-collection-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div>
            <h2>{getIcon()} {getTitle()}</h2>
            <p>{items.length} item{items.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <div className="hub-record-list">
          {items.length > 0 ? (
            items.map((item) => (
              <article key={item.id}>
                <button className="hub-record-main" onClick={() => onEdit(item)} type="button">
                  <span>✎</span>
                  <span>
                    {renderItem(item)}
                  </span>
                </button>
                <button
                  className="hub-record-delete"
                  onClick={() => {
                    if (confirm(`Delete ${item.name}?`)) {
                      onDelete(item.id);
                    }
                  }}
                  type="button"
                  title="Delete"
                >
                  <X size={16} />
                </button>
              </article>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
              <p style={{ fontSize: "13px", margin: 0 }}>No {getTitle().toLowerCase()} yet</p>
            </div>
          )}
        </div>

        <div style={{ padding: "16px", borderTop: "1px solid var(--line)", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={close} type="button">
            Close
          </button>
          <button onClick={onAdd} className="primary" type="button">
            + Add {getTitle().slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApplicationModal({
  application,
  close,
  save,
  hub,
}: {
  application?: Application;
  close: () => void;
  save: (application: Application) => void;
  hub: any;
}) {
  const [universityId, setUniversityId] = useState(application?.universityId ?? "");
  const [programId, setProgramId] = useState(application?.programId ?? "");
  const [intake, setIntake] = useState(application?.intake ?? "");
  const [status, setStatus] = useState(application?.status ?? "researching");
  const [applicantNumber, setApplicantNumber] = useState(application?.applicantNumber ?? "");
  const [dateSubmitted, setDateSubmitted] = useState(application?.dateSubmitted ?? "");
  const [notes, setNotes] = useState(application?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!universityId || !programId) return;

    const now = new Date().toISOString();
    const newApplication: Application = {
      id: application?.id ?? `app-${Date.now()}`,
      universityId: universityId as any,
      programId: programId as any,
      intake: intake.trim() || undefined,
      status: status as any,
      applicantNumber: applicantNumber.trim() || undefined,
      dateSubmitted: dateSubmitted || undefined,
      notes: notes.trim() || undefined,
      lastUpdated: now,
      createdAt: application?.createdAt ?? now,
      updatedAt: now,
    };

    save(newApplication);
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{application ? "Edit Application" : "Add Application"}</h2>
            <p>Track your application progress and status.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <label>
          University
          <select value={universityId} onChange={(e) => setUniversityId(e.target.value)} required>
            <option value="">Select a university</option>
            {hub.universities.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </label>

        <label>
          Program
          <select value={programId} onChange={(e) => setProgramId(e.target.value)} required>
            <option value="">Select a program</option>
            {hub.programs.filter((p: any) => !universityId || p.universityId === universityId).map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label>
          Intake
          <input value={intake} onChange={(e) => setIntake(e.target.value)} placeholder="e.g., Winter Semester 2026/27" />
        </label>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="researching">Researching</option>
            <option value="considering">Considering</option>
            <option value="preparing">Preparing</option>
            <option value="blocked">Blocked</option>
            <option value="ready_to_submit">Ready to submit</option>
            <option value="submitted">Submitted</option>
            <option value="awaiting_response">Awaiting response</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="rejected">Rejected</option>
            <option value="withdrawn">Withdrawn</option>
            <option value="deferred">Deferred</option>
          </select>
        </label>

        <label>
          Applicant Number
          <input value={applicantNumber} onChange={(e) => setApplicantNumber(e.target.value)} placeholder="e.g., 7382" />
        </label>

        <label>
          Date Submitted
          <input type="date" value={dateSubmitted} onChange={(e) => setDateSubmitted(e.target.value)} />
        </label>

        <label>
          Notes
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details about this application..." style={{ minHeight: "80px" }} />
        </label>

        <div>
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!universityId || !programId}>
            Save Application
          </button>
        </div>
      </form>
    </div>
  );
}

export function ScholarshipModal({
  scholarship,
  close,
  save,
}: {
  scholarship?: Scholarship;
  close: () => void;
  save: (scholarship: Scholarship) => void;
}) {
  const [name, setName] = useState(scholarship?.name ?? "");
  const [provider, setProvider] = useState(scholarship?.provider ?? "");
  const [status, setStatus] = useState(scholarship?.status ?? "researching");
  const [stipendAmount, setStipendAmount] = useState(scholarship?.stipendAmount?.toString() ?? "");
  const [stipendCurrency, setStipendCurrency] = useState(scholarship?.stipendCurrency ?? "EUR");
  const [coverage, setCoverage] = useState(scholarship?.coverage ?? "partial");
  const [deadline, setDeadline] = useState(scholarship?.deadline ?? "");
  const [eligibility, setEligibility] = useState(scholarship?.eligibilityNotes ?? "");
  const [notes, setNotes] = useState(scholarship?.notes ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date().toISOString();
    const newScholarship: Scholarship = {
      id: scholarship?.id ?? `sch-${Date.now()}`,
      name: name.trim(),
      provider: provider.trim() || undefined,
      status: status as any,
      stipendAmount: stipendAmount ? parseFloat(stipendAmount) : undefined,
      stipendCurrency: stipendCurrency.trim() || undefined,
      coverage: coverage as any,
      deadline: deadline || undefined,
      eligibilityNotes: eligibility.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: scholarship?.createdAt ?? now,
      updatedAt: now,
    };

    save(newScholarship);
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <form className="hub-profile-modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <header>
          <div>
            <h2>{scholarship ? "Edit Scholarship" : "Add Scholarship"}</h2>
            <p>Track scholarship opportunities and applications.</p>
          </div>
          <button type="button" onClick={close}>
            <X size={18} />
          </button>
        </header>

        <label>
          Scholarship Name
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., DAAD Scholarship" required />
        </label>

        <label>
          Provider
          <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="e.g., German Academic Exchange Service" />
        </label>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
            <option value="researching">Researching</option>
            <option value="eligible">Eligible</option>
            <option value="possibly_eligible">Possibly eligible</option>
            <option value="not_eligible">Not eligible</option>
            <option value="submitted">Submitted</option>
            <option value="awarded">Awarded</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <label>
            Stipend Amount
            <input type="number" value={stipendAmount} onChange={(e) => setStipendAmount(e.target.value)} placeholder="e.g., 934" />
          </label>
          <label>
            Currency
            <input value={stipendCurrency} onChange={(e) => setStipendCurrency(e.target.value)} placeholder="EUR" />
          </label>
        </div>

        <label>
          Coverage
          <select value={coverage} onChange={(e) => setCoverage(e.target.value as any)}>
            <option value="full">Full</option>
            <option value="partial">Partial</option>
            <option value="tuition_only">Tuition only</option>
            <option value="living_stipend">Living stipend</option>
          </select>
        </label>

        <label>
          Application Deadline
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>

        <label>
          Eligibility Requirements
          <textarea value={eligibility} onChange={(e) => setEligibility(e.target.value)} placeholder="Requirements you've checked..." style={{ minHeight: "60px" }} />
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
            Save Scholarship
          </button>
        </div>
      </form>
    </div>
  );
}
