"use client";

import { useState } from "react";
import { X, Plus, Search, Trash2, ExternalLink } from "lucide-react";
import type {
  JobApplication, Interview, Recruiter, NetworkConnection, JobOffer,
  Certification, Skill, CareerGoal, PortfolioProject, Opportunity,
  JobApplicationStatus, InterviewType, InterviewOutcome, CertificationStatus,
  SkillProficiency, GoalCategory, GoalStatus, GoalPriority, OpportunityType, OpportunityStatus,
} from "@/lib/workosTypes";

type WorkOSCollectionType = "applications" | "interviews" | "recruiters" | "connections" | "offers" | "certifications" | "skills" | "goals" | "portfolio" | "opportunities";

interface WorkOSCollectionModalProps {
  type: WorkOSCollectionType;
  items: any[];
  close: () => void;
  add: (item: any) => void;
  update: (id: string, item: any) => void;
  remove: (id: string) => void;
}

function Modal({ title, subtitle, children, close }: { title: string; subtitle: string; children: React.ReactNode; close: () => void }) {
  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <div className="hub-collection-modal" onMouseDown={e => e.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">WorkOS</p>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <button aria-label="Close" onClick={close}><X size={19} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function WorkOSApplicationsModal({ items, close, add, update, remove }: Omit<WorkOSCollectionModalProps, "type"> & { type?: "applications" }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<JobApplicationStatus>("applied");
  const [salary, setSalary] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !position.trim()) return;
    const newApp: JobApplication = {
      id: `app-${Date.now()}`,
      company: company.trim(),
      position: position.trim(),
      url: url.trim(),
      appliedDate: new Date().toISOString().split("T")[0],
      status,
      salary: salary.trim() || undefined,
      deadline: deadline || undefined,
      progress: 0,
    };
    add(newApp);
    setCompany("");
    setPosition("");
    setUrl("");
    setStatus("applied");
    setSalary("");
    setDeadline("");
    setAdding(false);
  };

  const filtered = items.filter(i => `${i.company} ${i.position}`.toLowerCase().includes(query.toLowerCase()));
  const statuses: JobApplicationStatus[] = ["saved", "applied", "reviewing", "interviewing", "offered", "rejected", "accepted", "declined"];

  return (
    <Modal title="Job Applications" subtitle="Track positions, deadlines, and application status." close={close}>
      <div className="hub-modal-toolbar">
        <label><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search applications..." /></label>
        <button className="primary" onClick={() => setAdding(!adding)}><Plus size={15} /> Add</button>
      </div>

      {adding && (
        <form className="hub-add-form" onSubmit={handleAdd}>
          <label>Company<input autoFocus value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme Corp" /></label>
          <label>Position<input value={position} onChange={e => setPosition(e.target.value)} placeholder="Senior Engineer" /></label>
          <label>Job URL<input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></label>
          <label>Status<select value={status} onChange={e => setStatus(e.target.value as JobApplicationStatus)}>
            {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select></label>
          <label>Salary (if known)<input value={salary} onChange={e => setSalary(e.target.value)} placeholder="$120k-140k" /></label>
          <label>Application Deadline<input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></label>
          <div><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" disabled={!company.trim() || !position.trim()}>Save</button></div>
        </form>
      )}

      <div className="hub-record-list">
        {filtered.length ? filtered.map(app => (
          <article key={app.id}>
            <button className="hub-record-main" onClick={() => app.url && window.open(app.url, "_blank")}>
              <span style={{ color: "#4b8bdc" }}><ExternalLink size={14} /></span>
              <span>
                <strong>{app.company}</strong>
                <small>{app.position} · {app.status} · {app.appliedDate}</small>
              </span>
            </button>
            <button className="hub-record-delete" onClick={() => remove(app.id)}><Trash2 size={15} /></button>
          </article>
        )) : <div className="os-empty"><Trash2 size={19} /><p>No applications yet. Start tracking your job search.</p></div>}
      </div>
    </Modal>
  );
}

export function WorkOSSkillsModal({ items, close, add, remove }: Omit<WorkOSCollectionModalProps, "type" | "update"> & { type?: "skills" }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [proficiency, setProficiency] = useState<SkillProficiency>("intermediate");
  const [category, setCategory] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const newSkill: Skill = {
      id: `skill-${Date.now()}`,
      name: name.trim(),
      proficiency,
      category: category.trim() || undefined,
      yearsOfExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
      endorsements: 0,
    };
    add(newSkill);
    setName("");
    setProficiency("intermediate");
    setCategory("");
    setYearsExperience("");
    setAdding(false);
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()));
  const proficiencies: SkillProficiency[] = ["beginner", "intermediate", "advanced", "expert"];

  return (
    <Modal title="Skills" subtitle="Track expertise and professional capabilities." close={close}>
      <div className="hub-modal-toolbar">
        <label><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search skills..." /></label>
        <button className="primary" onClick={() => setAdding(!adding)}><Plus size={15} /> Add</button>
      </div>

      {adding && (
        <form className="hub-add-form" onSubmit={handleAdd}>
          <label>Skill Name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="TypeScript" /></label>
          <label>Category<input value={category} onChange={e => setCategory(e.target.value)} placeholder="Programming" /></label>
          <label>Proficiency<select value={proficiency} onChange={e => setProficiency(e.target.value as SkillProficiency)}>
            {proficiencies.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select></label>
          <label>Years of Experience<input type="number" min="0" step="0.5" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} placeholder="3" /></label>
          <div><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" disabled={!name.trim()}>Save</button></div>
        </form>
      )}

      <div className="hub-record-list">
        {filtered.length ? filtered.map(skill => (
          <article key={skill.id}>
            <button className="hub-record-main">
              <span style={{ color: "#47a47b" }}><span style={{ fontSize: "14px" }}>●</span></span>
              <span>
                <strong>{skill.name}</strong>
                <small>{skill.category ?? "Uncategorized"} · {skill.proficiency}</small>
              </span>
            </button>
            <button className="hub-record-delete" onClick={() => remove(skill.id)}><Trash2 size={15} /></button>
          </article>
        )) : <div className="os-empty"><Trash2 size={19} /><p>No skills yet. Add the first one.</p></div>}
      </div>
    </Modal>
  );
}

export function WorkOSGoalsModal({ items, close, add, remove }: Omit<WorkOSCollectionModalProps, "type" | "update"> & { type?: "goals" }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<GoalCategory>("role");
  const [priority, setPriority] = useState<GoalPriority>("high");
  const [targetDate, setTargetDate] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const newGoal: CareerGoal = {
      id: `goal-${Date.now()}`,
      title: title.trim(),
      category,
      priority,
      status: "active",
      targetDate: targetDate || undefined,
      createdDate: new Date().toISOString().split("T")[0],
      progress: 0,
    };
    add(newGoal);
    setTitle("");
    setCategory("role");
    setPriority("high");
    setTargetDate("");
    setAdding(false);
  };

  const filtered = items.filter(i => i.title.toLowerCase().includes(query.toLowerCase()));
  const categories: GoalCategory[] = ["role", "skill", "project", "company", "income", "learning"];

  return (
    <Modal title="Career Goals" subtitle="Long-term objectives and milestones." close={close}>
      <div className="hub-modal-toolbar">
        <label><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search goals..." /></label>
        <button className="primary" onClick={() => setAdding(!adding)}><Plus size={15} /> Add</button>
      </div>

      {adding && (
        <form className="hub-add-form" onSubmit={handleAdd}>
          <label>Goal<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="Find full-time IT role" /></label>
          <label>Category<select value={category} onChange={e => setCategory(e.target.value as GoalCategory)}>
            {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select></label>
          <label>Priority<select value={priority} onChange={e => setPriority(e.target.value as GoalPriority)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select></label>
          <label>Target Date<input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} /></label>
          <div><button type="button" onClick={() => setAdding(false)}>Cancel</button><button className="primary" disabled={!title.trim()}>Save</button></div>
        </form>
      )}

      <div className="hub-record-list">
        {filtered.length ? filtered.map(goal => (
          <article key={goal.id}>
            <button className="hub-record-main">
              <span style={{ color: "#d99b38" }}>★</span>
              <span>
                <strong>{goal.title}</strong>
                <small>{goal.category} · {goal.priority} · {goal.status}</small>
              </span>
            </button>
            <button className="hub-record-delete" onClick={() => remove(goal.id)}><Trash2 size={15} /></button>
          </article>
        )) : <div className="os-empty"><Trash2 size={19} /><p>No career goals yet. What are you working toward?</p></div>}
      </div>
    </Modal>
  );
}
