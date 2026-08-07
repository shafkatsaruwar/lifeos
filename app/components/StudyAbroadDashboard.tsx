"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen, CheckCircle2, ChevronRight, Clock3, FileText,
  FolderKanban, Globe2, GraduationCap, LayoutGrid, MapPin, NotebookPen,
  Plus, Search, Target, Wallet, X,
} from "lucide-react";
import {
  appendHistory,
  applicationProgram,
  applicationReadiness,
  applicationStageLabel,
  createDocumentVariant,
  daysUntil,
  ensureCountriesFromUniversities,
  fundingForProgram,
  getCountry,
  getDocument,
  getProgram,
  getUniversity,
  linkDocumentToApplication,
  linkFundingToProgram,
  newId,
  normalizeStudyAbroadHub,
  nowIso,
  programCountry,
  programNextActionLabel,
  programStatusLabel,
  programUniversity,
  programsForCountry,
  programsForUniversity,
  requirementReadiness,
  requirementsForApplication,
  requirementsForProgram,
  shortlistedPrograms,
  tasksForParent,
  universitiesForCountry,
  upcomingStudyAbroadItems,
  whatMattersNow,
} from "@/lib/studyAbroadHelpers";
import {
  APPLICATION_STAGES,
  DOCUMENT_STATUSES,
  emptyStudyAbroadHub,
  FUNDING_STATUSES,
  PROGRAM_STATUSES,
  type ApplicationStage,
  type DocumentCategory,
  type StudyAbroadHub,
  type StudyAbroadProgram,
  type StudyAbroadView,
} from "@/lib/studyAbroadTypes";

export type { StudyAbroadHub, StudyAbroadView };
export { emptyStudyAbroadHub, normalizeStudyAbroadHub, ensureCountriesFromUniversities };

function Section({
  icon: Icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: typeof LayoutGrid;
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="os-module">
      <div className="card-head">
        <div>
          <span className="section-icon violet"><Icon size={14} /></span>
          <h2>{title}</h2>
        </div>
        {action && onAction ? <button type="button" onClick={onAction}>{action}</button> : null}
      </div>
      <div className="os-module-body">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="os-empty">
      <Globe2 size={18} />
      <p>{children}</p>
    </div>
  );
}

function CrumbHeader({
  crumbs,
  title,
  subtitle,
}: {
  crumbs: { label: string; onClick?: () => void }[];
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="work-subview-header no-back" style={{ marginBottom: 16 }}>
      <div>
        {crumbs.length > 0 && (
          <p className="eyebrow" style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {index > 0 ? <span style={{ opacity: 0.45 }}>/</span> : null}
                {crumb.onClick ? (
                  <button type="button" onClick={crumb.onClick} style={{ border: 0, background: "transparent", color: "inherit", padding: 0, cursor: "pointer", font: "inherit" }}>
                    {crumb.label}
                  </button>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </p>
        )}
        <h2 style={{ marginTop: crumbs.length ? 4 : 0 }}>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
    </div>
  );
}

type CreateKind = "country" | "university" | "program" | "application" | "document" | "funding" | "task" | "knowledge";

function CreateModal({
  kind,
  hub,
  close,
  save,
  defaults,
}: {
  kind: CreateKind;
  hub: StudyAbroadHub;
  close: () => void;
  save: (hub: StudyAbroadHub) => void;
  defaults?: { countryId?: string; universityId?: string; programId?: string };
}) {
  const stamp = nowIso();
  const [name, setName] = useState("");
  const [countryId, setCountryId] = useState(defaults?.countryId || hub.countries[0]?.id || "");
  const [universityId, setUniversityId] = useState(defaults?.universityId || "");
  const [programId, setProgramId] = useState(defaults?.programId || "");
  const [extra, setExtra] = useState("");
  const [category, setCategory] = useState<DocumentCategory>("Other");
  const [parentType, setParentType] = useState<"program" | "application" | "document" | "funding" | "country">("program");
  const [parentId, setParentId] = useState("");

  const title =
    kind === "country" ? "Add country"
      : kind === "university" ? "Add university"
        : kind === "program" ? "Add program"
          : kind === "application" ? "Start application"
            : kind === "document" ? "Add document"
              : kind === "funding" ? "Add funding"
                : kind === "knowledge" ? "Add knowledge note"
                  : "Add task";

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed && kind !== "application") return;

    if (kind === "country") {
      save({
        ...hub,
        countries: [...hub.countries, {
          id: newId("country"),
          name: trimmed,
          active: true,
          createdAt: stamp,
          updatedAt: stamp,
          notes: extra || undefined,
        }],
      });
    } else if (kind === "university") {
      if (!countryId) return;
      save({
        ...hub,
        universities: [...hub.universities, {
          id: newId("uni"),
          countryId,
          name: trimmed,
          city: extra || undefined,
          createdAt: stamp,
          updatedAt: stamp,
          saved: true,
        }],
      });
    } else if (kind === "program") {
      if (!universityId) return;
      save({
        ...hub,
        programs: [...hub.programs, {
          id: newId("prog"),
          universityId,
          name: trimmed,
          intake: extra || undefined,
          status: "discovering",
          createdAt: stamp,
          updatedAt: stamp,
        }],
      });
    } else if (kind === "application") {
      if (!programId) return;
      const program = getProgram(hub, programId);
      save({
        ...hub,
        applications: [...hub.applications, {
          id: newId("app"),
          programId,
          intake: program?.intake || extra || undefined,
          stage: "preparing",
          createdAt: stamp,
          updatedAt: stamp,
        }],
        programs: hub.programs.map((item) =>
          item.id === programId && (item.status === "discovering" || item.status === "researching" || item.status === "shortlisted")
            ? { ...item, status: "preparing" as const, shortlisted: true, updatedAt: stamp }
            : item,
        ),
      });
    } else if (kind === "document") {
      save({
        ...hub,
        documents: [...hub.documents, {
          id: newId("doc"),
          name: trimmed,
          category,
          status: "draft",
          notes: extra || undefined,
          createdAt: stamp,
          updatedAt: stamp,
        }],
      });
    } else if (kind === "funding") {
      save({
        ...hub,
        funding: [...hub.funding, {
          id: newId("fund"),
          name: trimmed,
          kind: "scholarship",
          countryId: countryId || undefined,
          deadline: extra || undefined,
          status: "researching",
          createdAt: stamp,
          updatedAt: stamp,
        }],
      });
    } else if (kind === "knowledge") {
      save({
        ...hub,
        knowledge: [...hub.knowledge, {
          id: newId("know"),
          title: trimmed,
          body: extra || undefined,
          contextType: "general",
          createdAt: stamp,
          updatedAt: stamp,
        }],
      });
    } else if (kind === "task") {
      if (!parentId) return;
      save({
        ...hub,
        tasks: [...hub.tasks, {
          id: newId("task"),
          title: trimmed,
          parentType,
          parentId,
          due: extra || undefined,
          createdAt: stamp,
          updatedAt: stamp,
        }],
      });
    }
    close();
  };

  return (
    <div className="modal-layer hub-modal-layer" onMouseDown={close}>
      <div className="create-modal work-create-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="capture-head">
          <div>
            <p className="eyebrow">Study Abroad</p>
            <h3>{title}</h3>
          </div>
          <button type="button" onClick={close} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="settings-body" style={{ gap: 12, display: "grid" }}>
          {kind !== "application" && (
            <label>Name
              <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder={kind === "task" ? "What needs doing?" : "Name"} />
            </label>
          )}
          {(kind === "university" || kind === "funding") && (
            <label>Country
              <select value={countryId} onChange={(event) => setCountryId(event.target.value)}>
                <option value="">Select…</option>
                {hub.countries.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
          )}
          {kind === "program" && (
            <label>University
              <select value={universityId} onChange={(event) => setUniversityId(event.target.value)}>
                <option value="">Select…</option>
                {hub.universities.map((item) => {
                  const country = getCountry(hub, item.countryId);
                  return <option key={item.id} value={item.id}>{item.name}{country ? ` · ${country.name}` : ""}</option>;
                })}
              </select>
            </label>
          )}
          {kind === "application" && (
            <label>Program
              <select autoFocus value={programId} onChange={(event) => setProgramId(event.target.value)}>
                <option value="">Select…</option>
                {hub.programs.map((item) => {
                  const uni = programUniversity(hub, item);
                  return <option key={item.id} value={item.id}>{item.name}{uni ? ` · ${uni.name}` : ""}</option>;
                })}
              </select>
            </label>
          )}
          {kind === "document" && (
            <label>Category
              <select value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
                {["Passport", "Diploma", "Transcript", "English proficiency", "CV", "SOP", "Recommendation", "Certificate", "Portfolio", "Financial proof", "Other"].map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          )}
          {kind === "task" && (
            <>
              <label>Attached to
                <select value={parentType} onChange={(event) => { setParentType(event.target.value as typeof parentType); setParentId(""); }}>
                  <option value="program">Program</option>
                  <option value="application">Application</option>
                  <option value="document">Document</option>
                  <option value="funding">Funding</option>
                  <option value="country">Country</option>
                </select>
              </label>
              <label>Parent
                <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
                  <option value="">Select…</option>
                  {(parentType === "program" ? hub.programs : parentType === "application" ? hub.applications.map((app) => ({ id: app.id, name: getProgram(hub, app.programId)?.name || app.id })) : parentType === "document" ? hub.documents : parentType === "funding" ? hub.funding : hub.countries).map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name || item.title || item.id}</option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label>{kind === "university" ? "City" : kind === "program" || kind === "application" ? "Intake" : kind === "funding" || kind === "task" ? "Deadline / due" : kind === "knowledge" ? "Notes" : "Notes"}
            <input value={extra} onChange={(event) => setExtra(event.target.value)} placeholder="Optional" />
          </label>
        </div>
        <div className="create-actions">
          <button type="button" onClick={close}>Cancel</button>
          <button type="button" className="primary" onClick={submit}>Save</button>
        </div>
      </div>
    </div>
  );
}


function ProgramCard({
  hub,
  program,
  onOpen,
}: {
  hub: StudyAbroadHub;
  program: StudyAbroadProgram;
  onOpen: () => void;
}) {
  const university = programUniversity(hub, program);
  const country = programCountry(hub, program);
  const nextAction = programNextActionLabel(hub, program);
  return (
    <button type="button" className="work-project-card" onClick={onOpen} style={{ textAlign: "left", width: "100%" }}>
      <div className="card-head" style={{ marginBottom: 8 }}>
        <div>
          <strong>{program.name}</strong>
          <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
            {university?.name || "University"}{country ? ` · ${country.name}` : ""}
          </p>
        </div>
        <span className="work-priority-tag">{programStatusLabel(program.status)}</span>
      </div>
      <div className="work-stat-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <div><small style={{ color: "var(--muted)" }}>Fit</small><div>{program.fitScore ? `${program.fitScore}/10` : "—"}</div></div>
        <div><small style={{ color: "var(--muted)" }}>Next</small><div>{nextAction}</div></div>
      </div>
    </button>
  );
}

export type StudyAbroadFocusEntity = {
  kind: "program" | "university" | "country" | "application";
  id: string;
};

type CountryTab = "overview" | "programs" | "universities" | "funding" | "visa";
type ProgramTab = "overview" | "requirements" | "application" | "funding" | "documents" | "notes";
type ExploreSegment = "countries" | "programs";

export function StudyAbroadDashboard({
  hub: rawHub,
  studyView: controlledView,
  onChangeView,
  onChange,
  workspaceName,
  onOpenCalendar,
  onFocusStudyTask,
  focusEntity,
  onFocusEntityConsumed,
}: {
  hub: StudyAbroadHub;
  studyView?: StudyAbroadView;
  onChangeView?: (view: StudyAbroadView) => void;
  onChange: (hub: StudyAbroadHub) => void;
  workspaceName: string;
  onOpenCalendar?: () => void;
  onFocusStudyTask?: (taskId: string) => void;
  focusEntity?: StudyAbroadFocusEntity | null;
  onFocusEntityConsumed?: () => void;
}) {
  const hub = useMemo(() => ensureCountriesFromUniversities(normalizeStudyAbroadHub(rawHub)), [rawHub]);
  const [internalView, setInternalView] = useState<StudyAbroadView>("dashboard");
  const studyView = controlledView ?? internalView;
  const setStudyView = (view: StudyAbroadView) => {
    onChangeView?.(view);
    if (controlledView === undefined) setInternalView(view);
  };
  const [createKind, setCreateKind] = useState<CreateKind | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [programTab, setProgramTab] = useState<ProgramTab>("overview");
  const [countryTab, setCountryTab] = useState<CountryTab>("overview");
  const [exploreSegment, setExploreSegment] = useState<ExploreSegment>("countries");

  useEffect(() => {
    if (!focusEntity) return;
    if (focusEntity.kind === "program") {
      setSelectedProgramId(focusEntity.id);
      setProgramTab("overview");
      setStudyView("programs");
    } else if (focusEntity.kind === "university") {
      setSelectedUniversityId(focusEntity.id);
      setStudyView("universities");
    } else if (focusEntity.kind === "country") {
      setSelectedCountryId(focusEntity.id);
      setCountryTab("overview");
      setStudyView("countries");
    } else if (focusEntity.kind === "application") {
      setSelectedApplicationId(focusEntity.id);
      setStudyView("applications");
    }
    onFocusEntityConsumed?.();
  }, [focusEntity]);

  void workspaceName;
  const matter = whatMattersNow(hub);
  const shortlist = shortlistedPrograms(hub).slice(0, 5);
  const upcoming = upcomingStudyAbroadItems(hub, 5);
  const pathCountries = hub.countries.filter((item) => item.active !== false);

  const goHome = () => {
    setSelectedCountryId(null);
    setSelectedUniversityId(null);
    setSelectedProgramId(null);
    setSelectedApplicationId(null);
    setStudyView("dashboard");
  };

  const openProgram = (id: string) => {
    setSelectedProgramId(id);
    setProgramTab("overview");
    setStudyView("programs");
    onChange({
      ...hub,
      sessionMemory: { ...hub.sessionMemory, lastProgramId: id, lastView: "programs", updatedAt: nowIso() },
    });
  };

  const openCountry = (id: string) => {
    setSelectedCountryId(id);
    setCountryTab("overview");
    setStudyView("countries");
  };

  const openUniversity = (id: string) => {
    setSelectedUniversityId(id);
    setStudyView("universities");
  };

  const toggleCompare = (countryId: string) => {
    setCompareIds((current) =>
      current.includes(countryId) ? current.filter((id) => id !== countryId) : current.length >= 4 ? current : [...current, countryId],
    );
  };

  const runMatterAction = () => {
    if (matter.actionView === "create-country") {
      setCreateKind("country");
      return;
    }
    if (matter.actionView === "programs" && matter.focusId) {
      openProgram(matter.focusId);
      return;
    }
    if (matter.actionView === "applications" && matter.focusId) {
      const task = hub.tasks.find((item) => item.id === matter.focusId);
      if (task && onFocusStudyTask) {
        onFocusStudyTask(task.id);
        return;
      }
      setStudyView("applications");
      return;
    }
    if (matter.actionView === "dashboard") {
      goHome();
      return;
    }
    setStudyView(matter.actionView);
  };

  const updateProgram = (id: string, patch: Partial<StudyAbroadProgram>) => {
    onChange({
      ...hub,
      programs: hub.programs.map((item) => item.id === id ? { ...item, ...patch, updatedAt: nowIso() } : item),
    });
  };

  const updateApplicationStage = (id: string, stage: ApplicationStage) => {
    const previous = hub.applications.find((item) => item.id === id);
    const program = applicationProgram(hub, previous);
    let next = {
      ...hub,
      applications: hub.applications.map((item) => item.id === id ? { ...item, stage, updatedAt: nowIso(), submittedAt: stage === "submitted" ? nowIso() : item.submittedAt } : item),
    };
    next = appendHistory(next, `Application → ${applicationStageLabel(stage)}`, program?.name, "application", id);
    onChange(next);
  };

  const completeTask = (id: string) => {
    onChange({
      ...hub,
      tasks: hub.tasks.map((item) => item.id === id ? { ...item, done: true, completedAt: nowIso(), updatedAt: nowIso() } : item),
    });
  };

  const selectedProgram = selectedProgramId ? getProgram(hub, selectedProgramId) : undefined;
  const selectedCountry = selectedCountryId ? getCountry(hub, selectedCountryId) : undefined;
  const selectedUniversity = selectedUniversityId ? getUniversity(hub, selectedUniversityId) : undefined;
  const selectedApplication = selectedApplicationId ? hub.applications.find((item) => item.id === selectedApplicationId) : undefined;

  const filteredPrograms = hub.programs.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const uni = programUniversity(hub, item);
    const country = programCountry(hub, item);
    return [item.name, uni?.name, country?.name, item.field, item.status].some((value) => value?.toLowerCase().includes(q));
  });

  const homeCrumb = { label: "Study Abroad", onClick: goHome };

  const dashboard = !pathCountries.length ? (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="work-main">
        <Section icon={Globe2} title="Get started">
          <div className="soft-card" style={{ padding: 20 }}>
            <strong style={{ display: "block", fontSize: 18 }}>Where are you thinking about studying?</strong>
            <p style={{ margin: "8px 0 16px", color: "var(--muted)", fontSize: 14, lineHeight: 1.5 }}>
              Add a country to open your first path. Universities, programs, and applications stay one level deeper until you need them.
            </p>
            <button type="button" className="primary" onClick={() => setCreateKind("country")}>Add a country</button>
          </div>
        </Section>
      </div>
    </div>
  ) : (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="work-main">
        <Section icon={Target} title="What matters now">
          <div className="soft-card" style={{ padding: 16 }}>
            <strong style={{ display: "block", fontSize: 16 }}>{matter.title}</strong>
            <p style={{ margin: "6px 0 12px", color: "var(--muted)", fontSize: 13 }}>{matter.detail}</p>
            <button type="button" className="primary" onClick={runMatterAction}>{matter.actionLabel}</button>
          </div>
        </Section>

        <Section icon={Globe2} title="Your paths" action="+ Explore country" onAction={() => { setExploreSegment("countries"); setStudyView("explore"); }}>
          <div style={{ display: "grid", gap: 10 }}>
            {pathCountries.map((country) => {
              const programs = programsForCountry(hub, country.id);
              const shortlisted = programs.filter((item) => item.shortlisted || item.status === "shortlisted" || item.status === "preparing").length;
              return (
                <button key={country.id} type="button" className="work-deliverable-row" onClick={() => openCountry(country.id)}>
                  <div>
                    <strong>{country.name}</strong>
                    <span>{programs.length} program{programs.length === 1 ? "" : "s"} · {shortlisted} shortlisted</span>
                  </div>
                  <ChevronRight size={16} />
                </button>
              );
            })}
          </div>
        </Section>

        <Section icon={GraduationCap} title="Shortlist">
          {shortlist.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {shortlist.map((program) => (
                <ProgramCard key={program.id} hub={hub} program={program} onOpen={() => openProgram(program.id)} />
              ))}
            </div>
          ) : (
            <Empty>
              Shortlist stays empty until you save your strongest programs.
              <div style={{ marginTop: 12 }}>
                <button type="button" className="os-profile-button" onClick={() => { setExploreSegment("programs"); setStudyView("explore"); }}>Browse programs</button>
              </div>
            </Empty>
          )}
        </Section>

        <Section icon={Clock3} title="Upcoming" action={onOpenCalendar ? "Calendar" : undefined} onAction={onOpenCalendar}>
          {upcoming.length ? upcoming.map((item) => (
            <button
              key={item.id}
              type="button"
              className="work-task-row"
              onClick={() => item.programId ? openProgram(item.programId) : onOpenCalendar?.()}
            >
              <div>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <em>{item.days === 0 ? "Today" : `${item.days}d`}</em>
            </button>
          )) : (
            <Empty>Deadlines and timeline events appear here when you add them on programs or History.</Empty>
          )}
        </Section>
      </div>
    </div>
  );

  const exploreView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="work-main">
        <CrumbHeader crumbs={[homeCrumb]} title="Explore" subtitle="Discover countries and programs without a second dashboard." />
        <div className="work-view-tabs" style={{ marginBottom: 14 }}>
          <button type="button" className={exploreSegment === "countries" ? "selected" : ""} onClick={() => setExploreSegment("countries")}>Countries</button>
          <button type="button" className={exploreSegment === "programs" ? "selected" : ""} onClick={() => setExploreSegment("programs")}>Programs</button>
        </div>

        {exploreSegment === "countries" ? (
          <Section icon={Globe2} title="Countries" action="+ Country" onAction={() => setCreateKind("country")}>
            {hub.countries.length ? (
              <>
                {hub.countries.map((country) => {
                  const programs = programsForCountry(hub, country.id);
                  const shortlisted = programs.filter((item) => item.shortlisted || item.status === "shortlisted" || item.status === "preparing").length;
                  return (
                    <div key={country.id} className="work-deliverable-row" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button type="button" style={{ flex: 1, border: 0, background: "transparent", textAlign: "left" }} onClick={() => openCountry(country.id)}>
                        <strong style={{ display: "block" }}>{country.name}</strong>
                        <span style={{ color: "var(--muted)", fontSize: 12 }}>{programs.length} programs · {shortlisted} shortlisted</span>
                      </button>
                      <button type="button" className="os-profile-button" onClick={() => toggleCompare(country.id)}>
                        {compareIds.includes(country.id) ? "Selected" : "Compare"}
                      </button>
                    </div>
                  );
                })}
                {compareIds.length >= 2 ? (
                  <div style={{ marginTop: 12 }}>
                    <button type="button" className="primary" onClick={() => setStudyView("compare")}>Compare {compareIds.length} countries</button>
                  </div>
                ) : null}
              </>
            ) : (
              <Empty>
                Where are you thinking about studying?
                <div style={{ marginTop: 12 }}><button type="button" className="primary" onClick={() => setCreateKind("country")}>Add a country</button></div>
              </Empty>
            )}
          </Section>
        ) : (
          <Section icon={GraduationCap} title="Programs" action="+ Program" onAction={() => setCreateKind("program")}>
            <div className="hub-modal-toolbar" style={{ marginBottom: 12 }}>
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search programs…" />
            </div>
            {filteredPrograms.length ? filteredPrograms.map((program) => (
              <ProgramCard key={program.id} hub={hub} program={program} onOpen={() => openProgram(program.id)} />
            )) : (
              <Empty>
                Programs usually appear after you open a country and add a university.
                <div style={{ marginTop: 12 }}><button type="button" className="os-profile-button" onClick={() => setExploreSegment("countries")}>Browse countries</button></div>
              </Empty>
            )}
          </Section>
        )}
      </div>
    </div>
  );

  const countriesView = selectedCountry ? (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
      <div className="work-main">
        <CrumbHeader crumbs={[homeCrumb, { label: "Explore", onClick: () => { setSelectedCountryId(null); setExploreSegment("countries"); setStudyView("explore"); } }]} title={selectedCountry.name} subtitle="Country path" />
        <div className="work-view-tabs" style={{ marginBottom: 14 }}>
          {([
            ["overview", "Overview"],
            ["programs", "Programs"],
            ["universities", "Universities"],
            ["funding", "Funding"],
            ["visa", "Visa & Living"],
          ] as const).map(([id, label]) => (
            <button key={id} type="button" className={countryTab === id ? "selected" : ""} onClick={() => setCountryTab(id)}>{label}</button>
          ))}
        </div>

        {countryTab === "overview" && (
          <Section icon={LayoutGrid} title="Overview">
            <div className="work-stat-grid">
              <div className="work-stat-card"><strong>{universitiesForCountry(hub, selectedCountry.id).length}</strong><span>Universities</span></div>
              <div className="work-stat-card"><strong>{programsForCountry(hub, selectedCountry.id).length}</strong><span>Programs</span></div>
              <div className="work-stat-card"><strong>{selectedCountry.tuitionLevel || "—"}</strong><span>Tuition</span></div>
              <div className="work-stat-card"><strong>{selectedCountry.livingCostLevel || "—"}</strong><span>Living cost</span></div>
            </div>
            <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Notes
              <textarea value={selectedCountry.notes || ""} onChange={(event) => onChange({ ...hub, countries: hub.countries.map((item) => item.id === selectedCountry.id ? { ...item, notes: event.target.value, updatedAt: nowIso() } : item) })} rows={4} />
            </label>
          </Section>
        )}

        {countryTab === "universities" && (
          <Section icon={MapPin} title="Universities" action="+ University" onAction={() => setCreateKind("university")}>
            {universitiesForCountry(hub, selectedCountry.id).length ? universitiesForCountry(hub, selectedCountry.id).map((uni) => (
              <button key={uni.id} type="button" className="work-deliverable-row" onClick={() => openUniversity(uni.id)}>
                <div><strong>{uni.name}</strong><span>{uni.city || "City TBD"} · {programsForUniversity(hub, uni.id).length} programs</span></div>
                <ChevronRight size={16} />
              </button>
            )) : <Empty>No universities saved in {selectedCountry.name} yet.</Empty>}
          </Section>
        )}

        {countryTab === "programs" && (
          <Section icon={GraduationCap} title="Programs">
            {programsForCountry(hub, selectedCountry.id).length ? programsForCountry(hub, selectedCountry.id).map((program) => (
              <ProgramCard key={program.id} hub={hub} program={program} onOpen={() => openProgram(program.id)} />
            )) : <Empty>Add a university first, then attach programs there.</Empty>}
          </Section>
        )}

        {countryTab === "funding" && (
          <Section icon={Wallet} title="Funding" action="+ Funding opportunity" onAction={() => setCreateKind("funding")}>
            {hub.funding.filter((item) => item.countryId === selectedCountry.id).length ? hub.funding.filter((item) => item.countryId === selectedCountry.id).map((item) => (
              <div key={item.id} className="work-task-row"><div><strong>{item.name}</strong><span>{item.status}{item.deadline ? ` · ${item.deadline}` : ""}</span></div></div>
            )) : <Empty>No funding opportunities tagged to this country yet.</Empty>}
          </Section>
        )}

        {countryTab === "visa" && (
          <Section icon={FileText} title="Visa & living">
            <div className="soft-card" style={{ padding: 14, display: "grid", gap: 10 }}>
              <label>Student visa notes<textarea value={selectedCountry.visaNotes || ""} onChange={(event) => onChange({ ...hub, countries: hub.countries.map((item) => item.id === selectedCountry.id ? { ...item, visaNotes: event.target.value, updatedAt: nowIso() } : item) })} rows={3} /></label>
              <label>Financial proof<textarea value={selectedCountry.financialProofNotes || ""} onChange={(event) => onChange({ ...hub, countries: hub.countries.map((item) => item.id === selectedCountry.id ? { ...item, financialProofNotes: event.target.value, updatedAt: nowIso() } : item) })} rows={2} /></label>
              <label>Residence / post-study<textarea value={selectedCountry.postStudyNotes || ""} onChange={(event) => onChange({ ...hub, countries: hub.countries.map((item) => item.id === selectedCountry.id ? { ...item, postStudyNotes: event.target.value, updatedAt: nowIso() } : item) })} rows={2} /></label>
              <label>Cost of living<textarea value={selectedCountry.costOfLivingNotes || ""} onChange={(event) => onChange({ ...hub, countries: hub.countries.map((item) => item.id === selectedCountry.id ? { ...item, costOfLivingNotes: event.target.value, updatedAt: nowIso() } : item) })} rows={3} /></label>
            </div>
            {hub.costs.filter((item) => item.countryId === selectedCountry.id).map((cost) => (
              <div key={cost.id} className="work-task-row"><div><strong>{cost.title}</strong><span>{cost.amount || "—"} {cost.currency || ""}</span></div></div>
            ))}
          </Section>
        )}
      </div>
    </div>
  ) : (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Countries" />
      <Section icon={Globe2} title="All countries" action="+ Country" onAction={() => setCreateKind("country")}>
        {hub.countries.length ? hub.countries.map((country) => (
          <button key={country.id} type="button" className="work-deliverable-row" onClick={() => openCountry(country.id)}>
            <div><strong>{country.name}</strong><span>{programsForCountry(hub, country.id).length} programs</span></div>
            <ChevronRight size={16} />
          </button>
        )) : <Empty>Add countries as you explore.</Empty>}
      </Section>
    </div></div>
  );

  const universitiesView = selectedUniversity ? (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader
        crumbs={[
          homeCrumb,
          { label: getCountry(hub, selectedUniversity.countryId)?.name || "Country", onClick: () => openCountry(selectedUniversity.countryId) },
        ]}
        title={selectedUniversity.name}
        subtitle={selectedUniversity.city || undefined}
      />
      <Section icon={GraduationCap} title="Programs" action="+ Program" onAction={() => setCreateKind("program")}>
        {programsForUniversity(hub, selectedUniversity.id).length ? programsForUniversity(hub, selectedUniversity.id).map((program) => (
          <ProgramCard key={program.id} hub={hub} program={program} onOpen={() => openProgram(program.id)} />
        )) : <Empty>Programs are the application center. Add the degrees you’re considering here.</Empty>}
      </Section>
      <Section icon={NotebookPen} title="University notes">
        <textarea value={selectedUniversity.notes || ""} onChange={(event) => onChange({ ...hub, universities: hub.universities.map((item) => item.id === selectedUniversity.id ? { ...item, notes: event.target.value, updatedAt: nowIso() } : item) })} rows={4} />
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          <label>Website<input value={selectedUniversity.websiteUrl || ""} onChange={(event) => onChange({ ...hub, universities: hub.universities.map((item) => item.id === selectedUniversity.id ? { ...item, websiteUrl: event.target.value, updatedAt: nowIso() } : item) })} /></label>
          <label>Application portal<input value={selectedUniversity.applicationPortalUrl || ""} onChange={(event) => onChange({ ...hub, universities: hub.universities.map((item) => item.id === selectedUniversity.id ? { ...item, applicationPortalUrl: event.target.value, updatedAt: nowIso() } : item) })} /></label>
          <label>Application method<input value={selectedUniversity.applicationMethod || ""} onChange={(event) => onChange({ ...hub, universities: hub.universities.map((item) => item.id === selectedUniversity.id ? { ...item, applicationMethod: event.target.value, updatedAt: nowIso() } : item) })} placeholder="uni-assist / direct / VPD / …" /></label>
        </div>
      </Section>
    </div></div>
  ) : (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Universities" subtitle="Usually opened from a country path or search." />
      <Section icon={MapPin} title="Saved universities">
        {hub.universities.length ? hub.universities.map((uni) => (
          <button key={uni.id} type="button" className="work-deliverable-row" onClick={() => openUniversity(uni.id)}>
            <div><strong>{uni.name}</strong><span>{getCountry(hub, uni.countryId)?.name || "Country"} · {programsForUniversity(hub, uni.id).length} programs</span></div>
            <ChevronRight size={16} />
          </button>
        )) : <Empty>Open a country and add a university there.</Empty>}
      </Section>
    </div></div>
  );

  const programDetail = selectedProgram ? (() => {
    const university = programUniversity(hub, selectedProgram);
    const country = programCountry(hub, selectedProgram);
    const apps = hub.applications.filter((item) => item.programId === selectedProgram.id);
    const reqs = requirementsForProgram(hub, selectedProgram.id);
    const readiness = requirementReadiness(reqs);
    const linkedFunding = fundingForProgram(hub, selectedProgram.id);
    const nextTask = tasksForParent(hub, "program", selectedProgram.id).find((item) => !item.done);
    return (
      <div className="work-layout">
        <div className="work-main">
          <CrumbHeader
            crumbs={[
              homeCrumb,
              ...(country ? [{ label: country.name, onClick: () => openCountry(country.id) }] : []),
              ...(university ? [{ label: university.name, onClick: () => openUniversity(university.id) }] : []),
            ]}
            title={selectedProgram.name}
            subtitle={`${university?.name || "University"}${country ? ` · ${country.name}` : ""}`}
          />

          <div className="soft-card" style={{ padding: 14, marginBottom: 14, display: "grid", gap: 10 }}>
            <div>
              <small style={{ color: "var(--muted)" }}>Next action</small>
              <strong style={{ display: "block", marginTop: 4 }}>{programNextActionLabel(hub, selectedProgram)}</strong>
            </div>
            <div className="work-stat-grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <div className="work-stat-card"><strong>{readiness.percent}%</strong><span>Readiness</span></div>
              <div className="work-stat-card"><strong>{daysUntil(selectedProgram.deadline) ?? "—"}</strong><span>Days to deadline</span></div>
              <div className="work-stat-card"><strong>{selectedProgram.fitScore ? `${selectedProgram.fitScore}/10` : "—"}</strong><span>Fit</span></div>
            </div>
            {!apps.length ? (
              <button type="button" className="primary" onClick={() => setCreateKind("application")}>Start application</button>
            ) : null}
          </div>

          <div className="work-view-tabs" style={{ marginBottom: 14 }}>
            {(["overview", "requirements", "application", "funding", "documents", "notes"] as const).map((tab) => (
              <button key={tab} type="button" className={programTab === tab ? "selected" : ""} onClick={() => setProgramTab(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>
            ))}
          </div>

          {programTab === "overview" && (
            <>
              <Section icon={Target} title="Next action">
                {nextTask ? (
                  <div className="work-task-row" style={{ display: "flex", gap: 8 }}>
                    <button type="button" style={{ flex: 1, border: 0, background: "transparent", textAlign: "left" }} onClick={() => onFocusStudyTask?.(nextTask.id)}>
                      <strong style={{ display: "block" }}>{nextTask.title}</strong>
                      <span style={{ color: "var(--muted)", fontSize: 12 }}>Focus</span>
                    </button>
                    <button type="button" className="os-profile-button" aria-label="Complete task" onClick={() => completeTask(nextTask.id)}><CheckCircle2 size={16} /></button>
                  </div>
                ) : <Empty>No open task on this program yet.</Empty>}
              </Section>
              <Section icon={LayoutGrid} title="Status">
                <div style={{ display: "grid", gap: 8 }}>
                  <label>Status
                    <select value={selectedProgram.status} onChange={(event) => updateProgram(selectedProgram.id, { status: event.target.value as StudyAbroadProgram["status"], shortlisted: ["shortlisted", "preparing", "applied", "interview"].includes(event.target.value) || selectedProgram.shortlisted })}>
                      {PROGRAM_STATUSES.map((status) => <option key={status} value={status}>{programStatusLabel(status)}</option>)}
                    </select>
                  </label>
                  <label>Fit (1–10)
                    <input type="number" min={1} max={10} value={selectedProgram.fitScore ?? ""} onChange={(event) => updateProgram(selectedProgram.id, { fitScore: event.target.value ? Number(event.target.value) : undefined })} />
                  </label>
                  <label>Deadline
                    <input type="date" value={selectedProgram.deadline?.slice(0, 10) || ""} onChange={(event) => updateProgram(selectedProgram.id, { deadline: event.target.value || undefined })} />
                  </label>
                  <button type="button" className="os-profile-button" onClick={() => updateProgram(selectedProgram.id, { shortlisted: !selectedProgram.shortlisted, status: !selectedProgram.shortlisted ? "shortlisted" : selectedProgram.status })}>
                    {selectedProgram.shortlisted ? "Remove from shortlist" : "Add to shortlist"}
                  </button>
                </div>
              </Section>
            </>
          )}

          {programTab === "requirements" && (
            <Section icon={FileText} title="Requirements" action="Add requirement" onAction={() => {
              const title = window.prompt("Requirement title");
              if (!title?.trim()) return;
              onChange({
                ...hub,
                requirements: [...hub.requirements, {
                  id: newId("req"),
                  programId: selectedProgram.id,
                  title: title.trim(),
                  status: "missing",
                  createdAt: nowIso(),
                  updatedAt: nowIso(),
                }],
              });
            }}>
              {reqs.length ? reqs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="work-task-row"
                  onClick={() => {
                    const order = ["missing", "draft", "ready", "submitted", "waived"] as const;
                    const next = order[(order.indexOf(item.status as typeof order[number]) + 1) % order.length];
                    onChange({
                      ...hub,
                      requirements: hub.requirements.map((req) => req.id === item.id ? { ...req, status: next, updatedAt: nowIso() } : req),
                    });
                  }}
                >
                  <div><strong>{item.title}</strong><span>{item.category || "Requirement"}</span></div>
                  <em>{item.status}</em>
                </button>
              )) : <Empty>Requirements belong to this program.</Empty>}
            </Section>
          )}

          {programTab === "application" && (
            <Section icon={FolderKanban} title="Applications" action="Start application" onAction={() => setCreateKind("application")}>
              {apps.length ? apps.map((app) => {
                const ready = applicationReadiness(hub, app.id);
                return (
                  <button key={app.id} type="button" className="work-deliverable-row" onClick={() => { setSelectedApplicationId(app.id); setStudyView("applications"); }}>
                    <div>
                      <strong>{applicationStageLabel(app.stage)}</strong>
                      <span>{app.intake || selectedProgram.intake || "Intake TBD"} · {ready.percent}% ready</span>
                    </div>
                    <ChevronRight size={16} />
                  </button>
                );
              }) : <Empty>An application is a program + intake. Start one when you’re ready to prepare.</Empty>}
            </Section>
          )}

          {programTab === "funding" && (
            <Section icon={Wallet} title="Linked funding">
              {linkedFunding.length ? linkedFunding.map((item) => (
                <div key={item.id} className="work-task-row"><div><strong>{item.name}</strong><span>{item.status}</span></div></div>
              )) : <Empty>No funding linked yet.</Empty>}
              {hub.funding.length ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Link an opportunity:</p>
                  {hub.funding.filter((item) => !linkedFunding.some((linked) => linked.id === item.id)).slice(0, 6).map((item) => (
                    <button key={item.id} type="button" className="work-task-row" onClick={() => onChange(linkFundingToProgram(hub, selectedProgram.id, item.id))}>
                      <div><strong>{item.name}</strong><span>{item.status}</span></div>
                      <Plus size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 12 }}><button type="button" className="primary" onClick={() => setStudyView("funding")}>Add funding</button></div>
              )}
            </Section>
          )}

          {programTab === "documents" && (
            <Section icon={BookOpen} title="Documents" action="Library" onAction={() => setStudyView("documents")}>
              {(() => {
                const app = hub.applications.find((item) => item.programId === selectedProgram.id);
                const linked = app
                  ? hub.applicationDocuments.filter((item) => item.applicationId === app.id).map((item) => getDocument(hub, item.documentId)).filter(Boolean)
                  : [];
                return linked.length ? linked.map((doc) => (
                  <div key={doc!.id} className="work-task-row"><div><strong>{doc!.name}</strong><span>{doc!.category} · {doc!.status}</span></div></div>
                )) : <Empty>Link documents from the library to this program’s application.</Empty>;
              })()}
              {hub.applications.some((item) => item.programId === selectedProgram.id) && hub.documents.length > 0 && (
                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  {hub.documents.slice(0, 5).map((doc) => {
                    const app = hub.applications.find((item) => item.programId === selectedProgram.id)!;
                    return (
                      <button key={doc.id} type="button" className="os-profile-button" onClick={() => onChange(linkDocumentToApplication(hub, app.id, doc.id))}>
                        Link {doc.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </Section>
          )}

          {programTab === "notes" && (
            <Section icon={NotebookPen} title="Notes">
              <label>Why I like this<textarea value={selectedProgram.whyLike || ""} onChange={(event) => updateProgram(selectedProgram.id, { whyLike: event.target.value })} rows={3} /></label>
              <label style={{ display: "block", marginTop: 10 }}>Concerns<textarea value={selectedProgram.concerns || ""} onChange={(event) => updateProgram(selectedProgram.id, { concerns: event.target.value })} rows={3} /></label>
              <label style={{ display: "block", marginTop: 10 }}>Notes<textarea value={selectedProgram.notes || ""} onChange={(event) => updateProgram(selectedProgram.id, { notes: event.target.value })} rows={4} /></label>
            </Section>
          )}
        </div>
      </div>
    );
  })() : (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Programs" />
      <Section icon={GraduationCap} title="All programs" action="+ Program" onAction={() => setCreateKind("program")}>
        {filteredPrograms.length ? filteredPrograms.map((program) => (
          <ProgramCard key={program.id} hub={hub} program={program} onOpen={() => openProgram(program.id)} />
        )) : <Empty>Add programs under a university.</Empty>}
      </Section>
    </div></div>
  );

  const applicationsView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Applications" subtitle="Pipeline by stage — opened when you need it." />
      {selectedApplication ? (
        <Section icon={FolderKanban} title={applicationProgram(hub, selectedApplication)?.name || "Application"}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {APPLICATION_STAGES.map((stage) => (
              <button key={stage} type="button" className={selectedApplication.stage === stage ? "primary" : "os-profile-button"} onClick={() => updateApplicationStage(selectedApplication.id, stage)}>
                {applicationStageLabel(stage)}
              </button>
            ))}
          </div>
          {(() => {
            const ready = applicationReadiness(hub, selectedApplication.id);
            const reqs = [...requirementsForApplication(hub, selectedApplication.id), ...requirementsForProgram(hub, selectedApplication.programId)];
            return (
              <>
                <div className="work-stat-card" style={{ marginBottom: 12 }}><strong>{ready.percent}%</strong><span>Readiness</span></div>
                {reqs.map((item) => (
                  <div key={item.id} className="work-task-row"><div><strong>{item.title}</strong><span>{item.status}</span></div></div>
                ))}
                {!reqs.length && <Empty>Add program requirements to calculate readiness from real data.</Empty>}
              </>
            );
          })()}
          <button type="button" className="os-profile-button" style={{ marginTop: 12 }} onClick={() => setSelectedApplicationId(null)}>Back to pipeline</button>
        </Section>
      ) : (
        <div className="work-kanban-board">
          {APPLICATION_STAGES.map((stage) => {
            const column = hub.applications.filter((item) => item.stage === stage);
            return (
              <div key={stage} className="work-kanban-column">
                <header><strong>{applicationStageLabel(stage)}</strong><span>{column.length}</span></header>
                {column.length ? column.map((app) => {
                  const program = applicationProgram(hub, app);
                  const uni = programUniversity(hub, program);
                  return (
                    <button key={app.id} type="button" className="work-kanban-task" onClick={() => setSelectedApplicationId(app.id)}>
                      <strong>{program?.name || "Program"}</strong>
                      <span>{uni?.name || "University"}</span>
                    </button>
                  );
                }) : <p className="os-empty" style={{ padding: 8 }}>Empty</p>}
              </div>
            );
          })}
        </div>
      )}
      {!hub.applications.length && !selectedApplication ? (
        <Section icon={FolderKanban} title="Get started">
          <Empty>Shortlist a program first, then start an application for a specific intake.</Empty>
        </Section>
      ) : null}
    </div></div>
  );

  const documentsView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Documents" subtitle="Reusable library — opened when something is blocking you." />
      <Section icon={FileText} title="Library" action="+ Document" onAction={() => setCreateKind("document")}>
        {hub.documents.length ? hub.documents.map((doc) => {
          const used = hub.applicationDocuments.filter((item) => item.documentId === doc.id).length;
          const isBase = !doc.variantOf && (doc.category === "SOP" || doc.category === "CV");
          return (
            <div key={doc.id} className="work-task-row" style={{ alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <strong>{doc.name}{doc.variantLabel ? ` · ${doc.variantLabel}` : ""}</strong>
                <span>{doc.category} · {doc.status}{used ? ` · used by ${used} application${used === 1 ? "" : "s"}` : ""}</span>
                {isBase ? (
                  <button
                    type="button"
                    className="os-profile-button"
                    style={{ marginTop: 8 }}
                    onClick={() => {
                      const label = window.prompt("Variant label (e.g. THI UX Design Version)");
                      if (!label?.trim()) return;
                      onChange(createDocumentVariant(hub, doc.id, label.trim()));
                    }}
                  >
                    Create program variant
                  </button>
                ) : null}
              </div>
              <select
                value={doc.status}
                onChange={(event) => onChange(appendHistory({
                  ...hub,
                  documents: hub.documents.map((item) => item.id === doc.id ? { ...item, status: event.target.value as typeof doc.status, updatedAt: nowIso() } : item),
                }, `Document → ${event.target.value.replace(/_/g, " ")}`, doc.name, "document", doc.id))}
              >
                {DOCUMENT_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          );
        }) : (
          <Empty>
            Passport, diploma, transcript, CV, SOP — store once, reuse across applications.
            <div style={{ marginTop: 12 }}><button type="button" className="primary" onClick={() => setCreateKind("document")}>Add document</button></div>
          </Empty>
        )}
      </Section>
    </div></div>
  );

  const fundingView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Funding" />
      <Section icon={Wallet} title="Opportunities" action="+ Funding opportunity" onAction={() => setCreateKind("funding")}>
        {hub.funding.length ? hub.funding.map((item) => (
          <div key={item.id} className="work-task-row">
            <div>
              <strong>{item.name}</strong>
              <span>{item.kind} · {item.status}{item.deadline ? ` · ${item.deadline}` : ""}{item.countryId ? ` · ${getCountry(hub, item.countryId)?.name || ""}` : ""}</span>
            </div>
            <select
              value={item.status}
              onChange={(event) => onChange({
                ...hub,
                funding: hub.funding.map((fund) => fund.id === item.id ? { ...fund, status: event.target.value as typeof item.status, updatedAt: nowIso() } : fund),
              })}
            >
              {FUNDING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
        )) : (
          <Empty>
            Track scholarships and aid here. Eligibility stays manual.
            <div style={{ marginTop: 12 }}><button type="button" className="primary" onClick={() => setCreateKind("funding")}>Add funding</button></div>
          </Empty>
        )}
      </Section>
    </div></div>
  );

  const knowledgeView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Knowledge" />
      <Section icon={BookOpen} title="Notes" action="+ Note" onAction={() => setCreateKind("knowledge")}>
        {hub.knowledge.length ? hub.knowledge.map((item) => (
          <div key={item.id} className="work-task-row"><div><strong>{item.title}</strong><span>{item.contextType}{item.body ? ` · ${item.body.slice(0, 80)}` : ""}</span></div></div>
        )) : <Empty>Visa research and admissions notes live here when you need them.</Empty>}
      </Section>
    </div></div>
  );

  const historyView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="History" />
      <Section icon={Clock3} title="Activity" action="Add timeline event" onAction={() => {
        const title = window.prompt("Timeline event title");
        if (!title?.trim()) return;
        const date = window.prompt("Date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10)) || new Date().toISOString().slice(0, 10);
        const stamp = nowIso();
        onChange(appendHistory({
          ...hub,
          timelineEvents: [...hub.timelineEvents, {
            id: newId("tl"),
            title: title.trim(),
            date,
            kind: "deadline",
            createdAt: stamp,
          }],
        }, "Added timeline event", title.trim(), "general"));
      }}>
        {(hub.history || []).length ? (hub.history || []).slice(0, 30).map((item) => (
          <div key={item.id} className="work-task-row"><div><strong>{item.title}</strong><span>{item.at.slice(0, 16).replace("T", " ")}{item.detail ? ` · ${item.detail}` : ""}</span></div></div>
        )) : <Empty>Stage changes and links land here quietly.</Empty>}
      </Section>
      <Section icon={Clock3} title="Timeline events" action="Open calendar" onAction={onOpenCalendar}>
        {hub.timelineEvents.length ? hub.timelineEvents.map((item) => (
          <div key={item.id} className="work-task-row"><div><strong>{item.title}</strong><span>{item.date} · {item.kind}</span></div></div>
        )) : <Empty>Deadlines sync into the LifeOS Calendar.</Empty>}
      </Section>
    </div></div>
  );

  const databaseView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb]} title="Database" subtitle="Inventory when you need counts — not a primary surface." />
      <Section icon={LayoutGrid} title="Counts">
        <div className="work-stat-grid">
          {[
            ["Countries", hub.countries.length],
            ["Universities", hub.universities.length],
            ["Programs", hub.programs.length],
            ["Applications", hub.applications.length],
            ["Documents", hub.documents.length],
            ["Funding", hub.funding.length],
          ].map(([label, count]) => (
            <div key={String(label)} className="work-stat-card"><strong>{count}</strong><span>{label}</span></div>
          ))}
        </div>
      </Section>
    </div></div>
  );

  const compareView = (
    <div className="work-layout" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}><div className="work-main">
      <CrumbHeader crumbs={[homeCrumb, { label: "Explore", onClick: () => { setExploreSegment("countries"); setStudyView("explore"); } }]} title="Compare countries" subtitle="Only fields you entered." />
      <Section icon={LayoutGrid} title="Selected">
        {!compareIds.length ? (
          <Empty>Select countries from Explore, then compare.</Empty>
        ) : (
          <div className="work-stat-grid" style={{ gridTemplateColumns: `repeat(${Math.min(compareIds.length, 4)}, minmax(0, 1fr))` }}>
            {compareIds.map((id) => {
              const country = getCountry(hub, id);
              if (!country) return null;
              return (
                <div key={id} className="soft-card" style={{ padding: 14 }}>
                  <strong>{country.name}</strong>
                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                    Tuition: {country.tuitionLevel || "—"}<br />
                    Living: {country.livingCostLevel || "—"}<br />
                    Language: {country.languageNotes || "—"}<br />
                    Universities: {universitiesForCountry(hub, id).length}<br />
                    Programs: {programsForCountry(hub, id).length}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div></div>
  );

  let body = dashboard;
  if (studyView === "explore") body = exploreView;
  else if (studyView === "countries") body = countriesView;
  else if (studyView === "universities") body = universitiesView;
  else if (studyView === "programs") body = programDetail;
  else if (studyView === "applications") body = applicationsView;
  else if (studyView === "documents") body = documentsView;
  else if (studyView === "funding") body = fundingView;
  else if (studyView === "knowledge") body = knowledgeView;
  else if (studyView === "history") body = historyView;
  else if (studyView === "database") body = databaseView;
  else if (studyView === "compare") body = compareView;

  const showHero = studyView === "dashboard";

  return (
    <div className="os-dashboard work-dashboard study-abroad-dashboard">
      {showHero ? (
        <div className="os-hero">
          <div>
            <p className="eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1>Study Abroad</h1>
            <p>Plan, compare, apply.</p>
          </div>
        </div>
      ) : null}

      {body}

      {createKind && (
        <CreateModal
          kind={createKind}
          hub={hub}
          close={() => setCreateKind(null)}
          save={onChange}
          defaults={{
            countryId: selectedCountryId || undefined,
            universityId: selectedUniversityId || undefined,
            programId: selectedProgramId || undefined,
          }}
        />
      )}
    </div>
  );
}
