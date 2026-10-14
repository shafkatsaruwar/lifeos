"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutGrid,
  LineChart,
  Plus,
  Search,
  Settings2,
  Target,
  Users,
  X,
} from "lucide-react";
import {
  companyName,
  completeTask,
  computeCareerAnalytics,
  createApplication,
  createInterview,
  createTask,
  dashboardMetrics,
  deleteApplication,
  exportApplicationsCsv,
  filterApplications,
  importApplications,
  interviewIcs,
  linkDocument,
  moveApplicationStage,
  parseApplicationsCsv,
  recordInteraction,
  updateApplication,
  updateInterview,
  upsertCompany,
  upsertContact,
} from "@/lib/careerHelpers";
import {
  CAREER_STAGES,
  emptyCareerHub,
  type ApplicationPriority,
  type CareerApplication,
  type CareerHub,
  type CareerStageId,
  type CareerView,
  type InteractionType,
  type InterviewType,
  type WorkArrangement,
} from "@/lib/careerTypes";

export type { CareerHub, CareerView };
export { emptyCareerHub };

type Props = {
  hub: CareerHub;
  careerView: CareerView;
  onChangeView: (view: CareerView) => void;
  onChange: (hub: CareerHub) => void;
  workspaceName: string;
  flash?: (message: string) => void;
};

const VIEWS: { id: CareerView; label: string; icon: typeof LayoutGrid }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "applications", label: "Applications", icon: ClipboardList },
  { id: "pipeline", label: "Pipeline", icon: Target },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "interviews", label: "Interviews", icon: CalendarDays },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "analytics", label: "Analytics", icon: LineChart },
  { id: "settings", label: "Settings", icon: Settings2 },
];

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
      <header>
        <div>
          <Icon size={17} />
          <h2>{title}</h2>
        </div>
        {action && onAction ? (
          <button type="button" onClick={onAction}>
            {action}
            <ChevronRight size={14} />
          </button>
        ) : null}
      </header>
      <div className="os-module-body">{children}</div>
    </section>
  );
}

function Empty({
  children,
  action,
  onAction,
}: {
  children: React.ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="os-empty career-empty">
      <BriefcaseBusiness size={22} />
      <div>
        <p>{children}</p>
        {action && onAction ? (
          <button type="button" className="os-profile-button" style={{ marginTop: 10 }} onClick={onAction}>
            {action}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function applyResult(
  result: CareerHub | { error: string },
  onChange: (hub: CareerHub) => void,
  flash?: (message: string) => void,
  okMessage?: string,
) {
  if ("error" in result) {
    flash?.(result.error);
    return false;
  }
  onChange(result);
  if (okMessage) flash?.(okMessage);
  return true;
}

export function CareerDashboard({ hub, careerView, onChangeView, onChange, workspaceName, flash }: Props) {
  const metrics = useMemo(() => dashboardMetrics(hub), [hub]);
  const analytics = useMemo(() => computeCareerAnalytics(hub), [hub]);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<CareerStageId | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<ApplicationPriority | "all">("all");
  const [sort, setSort] = useState<"updated" | "applied" | "company" | "title" | "next_action">("updated");
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [composer, setComposer] = useState<null | "application" | "company" | "interview" | "contact" | "task" | "interaction" | "document">(null);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<ReturnType<typeof parseApplicationsCsv> | null>(null);

  const apps = useMemo(
    () =>
      filterApplications(hub, {
        query,
        stageId: stageFilter,
        priority: priorityFilter,
        sort,
      }),
    [hub, query, stageFilter, priorityFilter, sort],
  );
  const selectedApp = hub.applications.find((a) => a.id === selectedAppId) || null;

  return (
    <div className="career-dashboard os-dashboard" data-env="career">
      <div className="os-hero">
        <div>
          <p className="eyebrow">Career · Job Seeker OS</p>
          <h1>Job search command center</h1>
          <p>
            {workspaceName.trim() || "You"} · {metrics.active} active · {metrics.upcomingInterviews} upcoming interviews
          </p>
        </div>
        <button type="button" className="os-now-button" onClick={() => setComposer("application")}>
          <Plus size={15} /> Add application
        </button>
      </div>

      <nav className="career-subnav" aria-label="Career sections">
        {VIEWS.map((view) => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              type="button"
              className={careerView === view.id ? "active" : ""}
              onClick={() => {
                setSelectedAppId(null);
                onChangeView(view.id);
              }}
            >
              <Icon size={14} />
              <span>{view.label}</span>
            </button>
          );
        })}
      </nav>

      {careerView === "overview" && (
        <div className="career-overview">
          <div className="career-metric-grid">
            {[
              ["Total", metrics.total],
              ["Active", metrics.active],
              ["Awaiting response", metrics.awaiting],
              ["Interviews", metrics.upcomingInterviews],
              ["Offers", metrics.offers],
              ["Rejections", metrics.rejections],
              ["Follow-ups due", metrics.followUpsDue],
            ].map(([label, value]) => (
              <div key={String(label)} className="career-metric">
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <div className="os-quick-row career-quick-row">
            {[
              ["Add application", () => setComposer("application")],
              ["Add interview", () => setComposer("interview")],
              ["Add company", () => setComposer("company")],
              ["Record interaction", () => setComposer("interaction")],
              ["Create follow-up", () => setComposer("task")],
              ["Open pipeline", () => onChangeView("pipeline")],
            ].map(([label, action]) => (
              <button key={String(label)} type="button" className="os-quick-action" onClick={action as () => void}>
                <Plus size={14} />
                {label as string}
              </button>
            ))}
          </div>

          {!hub.applications.length ? (
            <Empty action="Add your first application" onAction={() => setComposer("application")}>
              Track every role, stage, interview, and follow-up in one Career workspace. Nothing is invented — start by
              adding a real application.
            </Empty>
          ) : (
            <div className="os-dashboard-grid">
              <div className="os-dashboard-main">
                <Section icon={Target} title="Action center" action="Applications" onAction={() => onChangeView("applications")}>
                  {!metrics.upcomingInterviewList.length && !metrics.overdueFollowUps.length && !metrics.needsAttention.length ? (
                    <Empty>You’re clear — no overdue follow-ups or upcoming interviews.</Empty>
                  ) : (
                    <div className="career-action-list">
                      {metrics.upcomingInterviewList.map((item) => {
                        const app = hub.applications.find((a) => a.id === item.applicationId);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="career-action-row"
                            onClick={() => {
                              setSelectedAppId(item.applicationId);
                              onChangeView("interviews");
                            }}
                          >
                            <strong>{item.title}</strong>
                            <small>
                              {new Date(item.startsAt).toLocaleString()} · {app?.jobTitle || "Application"}
                            </small>
                          </button>
                        );
                      })}
                      {metrics.overdueFollowUps.map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          className="career-action-row warn"
                          onClick={() => {
                            setSelectedAppId(app.id);
                            onChangeView("applications");
                          }}
                        >
                          <strong>Overdue · {app.nextAction || "Follow up"}</strong>
                          <small>
                            {app.jobTitle} · {companyName(hub, app.companyId)} · due {app.nextActionDueAt?.slice(0, 10)}
                          </small>
                        </button>
                      ))}
                      {metrics.needsAttention.slice(0, 6).map((app) => (
                        <button
                          key={`need-${app.id}`}
                          type="button"
                          className="career-action-row"
                          onClick={() => {
                            setSelectedAppId(app.id);
                            onChangeView("applications");
                          }}
                        >
                          <strong>{app.jobTitle}</strong>
                          <small>
                            Needs attention · {stageLabelSafe(app.stageId)} · {companyName(hub, app.companyId)}
                          </small>
                        </button>
                      ))}
                    </div>
                  )}
                </Section>

                <Section icon={ClipboardList} title="Recent activity" action="All apps" onAction={() => onChangeView("applications")}>
                  {metrics.recentActivity.length ? (
                    <div className="career-action-list">
                      {metrics.recentActivity.map((item) => (
                        <div key={item.id} className="career-action-row static">
                          <strong>{item.summary}</strong>
                          <small>{new Date(item.occurredAt).toLocaleString()}</small>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty>Activity will appear as you update applications.</Empty>
                  )}
                </Section>
              </div>

              <aside className="os-dashboard-side">
                <Section icon={Target} title="Pipeline overview" action="Board" onAction={() => onChangeView("pipeline")}>
                  <div className="career-stage-bars">
                    {metrics.byStage
                      .filter((s) => s.count > 0)
                      .map((stage) => (
                        <div key={stage.id}>
                          <span>
                            {stage.name}
                            <b>{stage.count}</b>
                          </span>
                          <i style={{ width: `${Math.max(8, (stage.count / Math.max(metrics.total, 1)) * 100)}%` }} />
                        </div>
                      ))}
                    {!metrics.total ? <Empty>No applications yet.</Empty> : null}
                  </div>
                </Section>
              </aside>
            </div>
          )}
        </div>
      )}

      {(careerView === "applications" || careerView === "pipeline") && (
        <ApplicationsPanel
          hub={hub}
          mode={careerView === "pipeline" ? "kanban" : "list"}
          apps={apps}
          query={query}
          setQuery={setQuery}
          stageFilter={stageFilter}
          setStageFilter={setStageFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          sort={sort}
          setSort={setSort}
          selectedApp={selectedApp}
          setSelectedAppId={setSelectedAppId}
          onChange={onChange}
          flash={flash}
          onAdd={() => setComposer("application")}
        />
      )}

      {careerView === "companies" && (
        <CompaniesPanel hub={hub} onChange={onChange} flash={flash} onAdd={() => setComposer("company")} />
      )}

      {careerView === "interviews" && (
        <InterviewsPanel
          hub={hub}
          onChange={onChange}
          flash={flash}
          onAdd={() => setComposer("interview")}
          selectedAppId={selectedAppId}
        />
      )}

      {careerView === "contacts" && (
        <ContactsPanel hub={hub} onChange={onChange} flash={flash} onAdd={() => setComposer("contact")} />
      )}

      {careerView === "documents" && (
        <DocumentsPanel hub={hub} onChange={onChange} flash={flash} onAdd={() => setComposer("document")} />
      )}

      {careerView === "analytics" && <AnalyticsPanel analytics={analytics} total={hub.applications.length} />}

      {careerView === "settings" && (
        <Section icon={Settings2} title="Import / export">
          <div className="career-settings-body">
            <p className="settings-note">
              Export includes application fields and notes you entered. Review before sharing. CSV import maps common
              column names and previews before commit.
            </p>
            <div className="career-settings-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  const csv = exportApplicationsCsv(hub);
                  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `lifeos-career-applications-${new Date().toISOString().slice(0, 10)}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  flash?.("Exported applications CSV");
                }}
              >
                Export CSV
              </button>
            </div>
            <label className="career-field">
              Paste CSV
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} placeholder="job_title,company,stage,applied_at..." />
            </label>
            <div className="career-settings-actions">
              <button
                type="button"
                onClick={() => {
                  const preview = parseApplicationsCsv(csvText);
                  setCsvPreview(preview);
                  if (preview.errors.length) flash?.(preview.errors[0]);
                }}
              >
                Preview import
              </button>
              <button
                type="button"
                className="primary"
                disabled={!csvPreview?.rows.length}
                onClick={() => {
                  if (!csvPreview?.rows.length) return;
                  if (!window.confirm(`Import ${csvPreview.rows.length} application(s)? Duplicates are skipped.`)) return;
                  const result = importApplications(hub, csvPreview.rows);
                  onChange(result.hub);
                  flash?.(`Imported ${result.imported}, skipped ${result.skipped}`);
                  setCsvPreview(null);
                  setCsvText("");
                }}
              >
                Confirm import
              </button>
            </div>
            {csvPreview ? (
              <p className="settings-note">
                Preview: {csvPreview.rows.length} valid row(s)
                {csvPreview.errors.length ? ` · ${csvPreview.errors.length} error(s)` : ""}.
              </p>
            ) : null}
          </div>
        </Section>
      )}

      {composer ? (
        <ComposerModal
          kind={composer}
          hub={hub}
          close={() => setComposer(null)}
          onChange={onChange}
          flash={flash}
          defaultApplicationId={selectedAppId || undefined}
        />
      ) : null}
    </div>
  );
}

function stageLabelSafe(stageId: CareerStageId) {
  return CAREER_STAGES.find((s) => s.id === stageId)?.name ?? stageId;
}

function ApplicationsPanel({
  hub,
  mode,
  apps,
  query,
  setQuery,
  stageFilter,
  setStageFilter,
  priorityFilter,
  setPriorityFilter,
  sort,
  setSort,
  selectedApp,
  setSelectedAppId,
  onChange,
  flash,
  onAdd,
}: {
  hub: CareerHub;
  mode: "list" | "kanban";
  apps: CareerApplication[];
  query: string;
  setQuery: (v: string) => void;
  stageFilter: CareerStageId | "all";
  setStageFilter: (v: CareerStageId | "all") => void;
  priorityFilter: ApplicationPriority | "all";
  setPriorityFilter: (v: ApplicationPriority | "all") => void;
  sort: "updated" | "applied" | "company" | "title" | "next_action";
  setSort: (v: "updated" | "applied" | "company" | "title" | "next_action") => void;
  selectedApp: CareerApplication | null;
  setSelectedAppId: (id: string | null) => void;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="career-apps-layout">
      <div className="career-toolbar">
        <label className="career-search">
          <Search size={14} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, company, notes" />
        </label>
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value as CareerStageId | "all")}>
          <option value="all">All stages</option>
          {CAREER_STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as ApplicationPriority | "all")}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="updated">Recently updated</option>
          <option value="applied">Date applied</option>
          <option value="company">Company</option>
          <option value="title">Job title</option>
          <option value="next_action">Next action due</option>
        </select>
        <button type="button" className="primary" onClick={onAdd}>
          <Plus size={14} /> Add
        </button>
      </div>

      {mode === "kanban" ? (
        <div className="career-kanban">
          {CAREER_STAGES.map((stage) => {
            const column = apps.filter((a) => a.stageId === stage.id);
            return (
              <section
                key={stage.id}
                className="career-kanban-col"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/app-id");
                  if (!id) return;
                  const previous = hub;
                  const result = moveApplicationStage(hub, id, stage.id);
                  if (!applyResult(result, onChange, flash, `Moved to ${stage.name}`)) onChange(previous);
                }}
              >
                <header>
                  <strong>{stage.name}</strong>
                  <span>{column.length}</span>
                </header>
                <div className="career-kanban-cards">
                  {column.map((app) => (
                    <article
                      key={app.id}
                      className="career-kanban-card"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/app-id", app.id)}
                      onClick={() => setSelectedAppId(app.id)}
                    >
                      <strong>{app.jobTitle}</strong>
                      <small>{companyName(hub, app.companyId)}</small>
                      <label className="career-inline-stage">
                        <span className="sr-only">Move stage</span>
                        <select
                          value={app.stageId}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const previous = hub;
                            const result = moveApplicationStage(hub, app.id, e.target.value as CareerStageId);
                            if (!applyResult(result, onChange, flash)) onChange(previous);
                          }}
                        >
                          {CAREER_STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </article>
                  ))}
                  {!column.length ? <p className="career-col-empty">Drop apps here</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className={`career-split${selectedApp ? " has-detail" : ""}`}>
          <div className="career-list">
            {apps.length ? (
              apps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  className={`career-app-row${selectedApp?.id === app.id ? " active" : ""}`}
                  onClick={() => setSelectedAppId(app.id)}
                >
                  <strong>{app.jobTitle}</strong>
                  <small>
                    {companyName(hub, app.companyId)} · {stageLabelSafe(app.stageId)}
                    {app.nextActionDueAt ? ` · next ${app.nextActionDueAt.slice(0, 10)}` : ""}
                  </small>
                </button>
              ))
            ) : (
              <Empty action="Add application" onAction={onAdd}>
                No applications match these filters.
              </Empty>
            )}
          </div>
          {selectedApp ? (
            <ApplicationDetail
              hub={hub}
              app={selectedApp}
              onChange={onChange}
              flash={flash}
              onClose={() => setSelectedAppId(null)}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ApplicationDetail({
  hub,
  app,
  onChange,
  flash,
  onClose,
}: {
  hub: CareerHub;
  app: CareerApplication;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onClose: () => void;
}) {
  const history = hub.stageHistory.filter((h) => h.applicationId === app.id);
  const interviews = hub.interviews.filter((i) => i.applicationId === app.id);
  const tasks = hub.tasks.filter((t) => t.applicationId === app.id);
  const docs = hub.documents.filter((d) => d.applicationId === app.id);

  return (
    <aside className="career-detail">
      <header>
        <div>
          <p className="eyebrow">{companyName(hub, app.companyId)}</p>
          <h2>{app.jobTitle}</h2>
        </div>
        <button type="button" aria-label="Close detail" onClick={onClose}>
          <X size={16} />
        </button>
      </header>
      <div className="career-detail-body">
        <label className="career-field">
          Stage
          <select
            value={app.stageId}
            onChange={(e) => {
              const previous = hub;
              const result = moveApplicationStage(hub, app.id, e.target.value as CareerStageId);
              if (!applyResult(result, onChange, flash)) onChange(previous);
            }}
          >
            {CAREER_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="career-field">
          Priority
          <select
            value={app.priority || "medium"}
            onChange={(e) =>
              applyResult(
                updateApplication(hub, app.id, { priority: e.target.value as ApplicationPriority }),
                onChange,
                flash,
              )
            }
          >
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="career-field">
          Job URL
          <input
            defaultValue={app.jobUrl || ""}
            onBlur={(e) =>
              applyResult(updateApplication(hub, app.id, { jobUrl: e.target.value }), onChange, flash)
            }
          />
        </label>
        <label className="career-field">
          Location
          <input
            defaultValue={app.location || ""}
            onBlur={(e) =>
              applyResult(updateApplication(hub, app.id, { location: e.target.value }), onChange, flash)
            }
          />
        </label>
        <label className="career-field">
          Next action
          <input
            defaultValue={app.nextAction || ""}
            onBlur={(e) =>
              applyResult(updateApplication(hub, app.id, { nextAction: e.target.value }), onChange, flash)
            }
          />
        </label>
        <label className="career-field">
          Next action due
          <input
            type="date"
            defaultValue={app.nextActionDueAt?.slice(0, 10) || ""}
            onChange={(e) =>
              applyResult(
                updateApplication(hub, app.id, { nextActionDueAt: e.target.value || undefined }),
                onChange,
                flash,
              )
            }
          />
        </label>
        <label className="career-field">
          Notes
          <textarea
            defaultValue={app.notes || ""}
            rows={4}
            onBlur={(e) => applyResult(updateApplication(hub, app.id, { notes: e.target.value }), onChange, flash)}
          />
        </label>

        <h3>Stage history</h3>
        <div className="career-action-list">
          {history.map((h) => (
            <div key={h.id} className="career-action-row static">
              <strong>
                {h.previousStageId ? `${stageLabelSafe(h.previousStageId)} → ` : ""}
                {stageLabelSafe(h.newStageId)}
              </strong>
              <small>{new Date(h.changedAt).toLocaleString()}</small>
            </div>
          ))}
        </div>

        <h3>Interviews ({interviews.length})</h3>
        <div className="career-action-list">
          {interviews.map((i) => (
            <div key={i.id} className="career-action-row static">
              <strong>{i.title}</strong>
              <small>{new Date(i.startsAt).toLocaleString()}</small>
            </div>
          ))}
          {!interviews.length ? <p className="settings-note">No interviews yet.</p> : null}
        </div>

        <h3>Follow-ups</h3>
        <div className="career-action-list">
          {tasks.map((t) => (
            <div key={t.id} className="career-action-row static">
              <strong>
                {t.completedAt ? "✓ " : ""}
                {t.title}
              </strong>
              <small>
                {t.dueAt?.slice(0, 10) || "No due date"}
                {!t.completedAt ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="career-text-btn"
                      onClick={() => applyResult(completeTask(hub, t.id), onChange, flash, "Task completed")}
                    >
                      Complete
                    </button>
                  </>
                ) : null}
              </small>
            </div>
          ))}
          {!tasks.length ? <p className="settings-note">No follow-up tasks.</p> : null}
        </div>

        <h3>Documents</h3>
        <div className="career-action-list">
          {docs.map((d) => (
            <div key={d.id} className="career-action-row static">
              <strong>
                {d.title} · {d.documentType}
              </strong>
              <small>
                {d.versionIdentifier || "unversioned"}
                {d.libraryDocumentId ? ` · library ${d.libraryDocumentId}` : ""}
              </small>
            </div>
          ))}
          {!docs.length ? <p className="settings-note">Link Library notes/files to preserve submitted versions.</p> : null}
        </div>

        <button
          type="button"
          className="danger-settings"
          onClick={() => {
            if (!window.confirm(`Delete application “${app.jobTitle}”? This cannot be undone.`)) return;
            onChange(deleteApplication(hub, app.id));
            onClose();
            flash?.("Application deleted");
          }}
        >
          Delete application
        </button>
      </div>
    </aside>
  );
}

function CompaniesPanel({
  hub,
  onChange,
  flash,
  onAdd,
}: {
  hub: CareerHub;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onAdd: () => void;
}) {
  return (
    <Section icon={Building2} title="Companies" action="Add company" onAction={onAdd}>
      {hub.companies.length ? (
        <div className="career-list">
          {hub.companies.map((company) => {
            const apps = hub.applications.filter((a) => a.companyId === company.id);
            return (
              <div key={company.id} className="career-app-row static">
                <strong>{company.name}</strong>
                <small>
                  {apps.length} application(s)
                  {company.industry ? ` · ${company.industry}` : ""}
                  {company.location ? ` · ${company.location}` : ""}
                </small>
                <label className="career-field" style={{ marginTop: 8 }}>
                  Research notes
                  <textarea
                    defaultValue={company.notes || ""}
                    rows={2}
                    onBlur={(e) =>
                      onChange(
                        upsertCompany(hub, {
                          id: company.id,
                          name: company.name,
                          notes: e.target.value,
                        }),
                      )
                    }
                  />
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty action="Add company" onAction={onAdd}>
          Companies are created automatically when you add applications, or add one here.
        </Empty>
      )}
    </Section>
  );
}

function InterviewsPanel({
  hub,
  onChange,
  flash,
  onAdd,
  selectedAppId,
}: {
  hub: CareerHub;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onAdd: () => void;
  selectedAppId: string | null;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = hub.interviews
    .filter((i) => i.startsAt.slice(0, 10) >= today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const past = hub.interviews
    .filter((i) => i.startsAt.slice(0, 10) < today)
    .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

  const renderList = (items: typeof hub.interviews) =>
    items.map((item) => {
      const app = hub.applications.find((a) => a.id === item.applicationId);
      const company = hub.companies.find((c) => c.id === app?.companyId);
      return (
        <div key={item.id} className="career-app-row static">
          <strong>{item.title}</strong>
          <small>
            {new Date(item.startsAt).toLocaleString()} · {app?.jobTitle || "Application"} · {company?.name || ""}
          </small>
          <div className="career-settings-actions" style={{ marginTop: 8 }}>
            <button
              type="button"
              onClick={() => {
                const ics = interviewIcs(item, app, company);
                const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${item.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export .ics
            </button>
            <button
              type="button"
              onClick={() =>
                applyResult(
                  updateInterview(hub, item.id, { outcome: "passed" }),
                  onChange,
                  flash,
                  "Interview marked complete",
                )
              }
            >
              Mark complete
            </button>
          </div>
          <div className="career-checklist">
            {(
              [
                ["reviewJobDescription", "Review job description"],
                ["researchCompany", "Research company"],
                ["reviewResume", "Review résumé"],
                ["prepareIntroduction", "Prepare introduction"],
                ["prepareStarExamples", "Prepare STAR examples"],
                ["prepareQuestions", "Prepare questions"],
                ["testMeetingLink", "Test meeting link"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(item.checklist?.[key])}
                  onChange={(e) =>
                    applyResult(
                      updateInterview(hub, item.id, {
                        checklist: { ...(item.checklist as any), [key]: e.target.checked },
                      }),
                      onChange,
                    )
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      );
    });

  return (
    <div className="os-two-up">
      <Section icon={CalendarDays} title="Upcoming" action="Add interview" onAction={onAdd}>
        {upcoming.length ? renderList(upcoming) : <Empty action="Schedule interview" onAction={onAdd}>No upcoming interviews.</Empty>}
      </Section>
      <Section icon={CheckCircle2} title="Past">
        {past.length ? renderList(past) : <Empty>Past interviews will show here.</Empty>}
      </Section>
      {selectedAppId ? <p className="settings-note">Tip: new interviews default to the selected application when available.</p> : null}
    </div>
  );
}

function ContactsPanel({
  hub,
  onChange,
  flash,
  onAdd,
}: {
  hub: CareerHub;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onAdd: () => void;
}) {
  return (
    <Section icon={Users} title="Recruiters & contacts" action="Add contact" onAction={onAdd}>
      {hub.contacts.length ? (
        <div className="career-list">
          {hub.contacts.map((contact) => (
            <div key={contact.id} className="career-app-row static">
              <strong>{contact.name}</strong>
              <small>
                {contact.role || "Contact"}
                {contact.email ? ` · ${contact.email}` : ""}
                {contact.companyId ? ` · ${companyName(hub, contact.companyId)}` : ""}
              </small>
              <div className="career-settings-actions" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(
                      recordInteraction(hub, {
                        interactionType: "follow_up",
                        contactId: contact.id,
                        companyId: contact.companyId,
                        notes: "Follow-up logged",
                      }),
                    );
                    flash?.("Interaction recorded");
                  }}
                >
                  Log follow-up
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty action="Add contact" onAction={onAdd}>
          Track recruiters and hiring managers without sending messages automatically.
        </Empty>
      )}
      {hub.interactions.length ? (
        <>
          <h3 style={{ padding: "12px 14px 0", fontSize: 12 }}>Recent interactions</h3>
          <div className="career-action-list">
            {hub.interactions.slice(0, 10).map((ix) => (
              <div key={ix.id} className="career-action-row static">
                <strong>{ix.interactionType.replace(/_/g, " ")}</strong>
                <small>
                  {new Date(ix.occurredAt).toLocaleString()}
                  {ix.notes ? ` · ${ix.notes}` : ""}
                </small>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Section>
  );
}

function DocumentsPanel({
  hub,
  onChange,
  flash,
  onAdd,
}: {
  hub: CareerHub;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  onAdd: () => void;
}) {
  return (
    <Section icon={FileText} title="Application documents" action="Link document" onAction={onAdd}>
      <p className="settings-note" style={{ padding: "12px 14px 0" }}>
        Link Library note/resource ids or URLs. Historical applications keep the version identifier you attach at
        submission time.
      </p>
      {hub.documents.length ? (
        <div className="career-list">
          {hub.documents.map((doc) => (
            <div key={doc.id} className="career-app-row static">
              <strong>
                {doc.title} · {doc.documentType}
              </strong>
              <small>
                {doc.versionIdentifier || "no version"}
                {doc.applicationId
                  ? ` · ${hub.applications.find((a) => a.id === doc.applicationId)?.jobTitle || "application"}`
                  : ""}
                {doc.libraryDocumentId ? ` · library:${doc.libraryDocumentId}` : ""}
              </small>
            </div>
          ))}
        </div>
      ) : (
        <Empty action="Link document" onAction={onAdd}>
          No documents linked yet.
        </Empty>
      )}
    </Section>
  );
}

function AnalyticsPanel({
  analytics,
  total,
}: {
  analytics: ReturnType<typeof computeCareerAnalytics>;
  total: number;
}) {
  if (!total) {
    return (
      <Empty>
        Analytics appear after you track real applications. Missing responses are not counted as rejections.
      </Empty>
    );
  }
  const pct = (value: number | null) => (value == null ? "—" : `${Math.round(value * 100)}%`);
  return (
    <div className="career-analytics">
      <div className="career-metric-grid">
        <div className="career-metric">
          <strong>{analytics.submittedCount}</strong>
          <span>Submitted</span>
        </div>
        <div className="career-metric">
          <strong>{pct(analytics.responseRate)}</strong>
          <span>Response rate</span>
        </div>
        <div className="career-metric">
          <strong>{pct(analytics.interviewConversionRate)}</strong>
          <span>Interview conversion</span>
        </div>
        <div className="career-metric">
          <strong>{pct(analytics.offerConversionRate)}</strong>
          <span>Offer conversion</span>
        </div>
        <div className="career-metric">
          <strong>{analytics.averageDaysToFirstResponse ?? "—"}</strong>
          <span>Avg days to response</span>
        </div>
        <div className="career-metric">
          <strong>{analytics.rejectionCount}</strong>
          <span>Rejections</span>
        </div>
      </div>
      <Section icon={LineChart} title="Applications by stage">
        <div className="career-stage-bars">
          {analytics.byStage
            .filter((s) => s.count > 0)
            .map((stage) => (
              <div key={stage.stageId}>
                <span>
                  {stage.name}
                  <b>{stage.count}</b>
                </span>
                <i style={{ width: `${Math.max(8, (stage.count / Math.max(total, 1)) * 100)}%` }} />
              </div>
            ))}
        </div>
      </Section>
      <Section icon={LineChart} title="By source">
        {analytics.bySource.length ? (
          <div className="career-stage-bars">
            {analytics.bySource.map((row) => (
              <div key={row.source}>
                <span>
                  {row.source}
                  <b>{row.count}</b>
                </span>
                <i style={{ width: `${Math.max(8, (row.count / Math.max(total, 1)) * 100)}%` }} />
              </div>
            ))}
          </div>
        ) : (
          <Empty>Add a source on applications to see this breakdown.</Empty>
        )}
      </Section>
      <Section icon={FileText} title="Metric definitions">
        <dl className="career-definitions">
          {Object.entries(analytics.definitions).map(([key, value]) => (
            <div key={key}>
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}

function ComposerModal({
  kind,
  hub,
  close,
  onChange,
  flash,
  defaultApplicationId,
}: {
  kind: "application" | "company" | "interview" | "contact" | "task" | "interaction" | "document";
  hub: CareerHub;
  close: () => void;
  onChange: (hub: CareerHub) => void;
  flash?: (message: string) => void;
  defaultApplicationId?: string;
}) {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [location, setLocation] = useState("");
  const [arrangement, setArrangement] = useState<WorkArrangement>("unknown");
  const [source, setSource] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [stageId, setStageId] = useState<CareerStageId>(appliedAt ? "applied" : "saved");
  const [applicationId, setApplicationId] = useState(defaultApplicationId || hub.applications[0]?.id || "");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("video");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [interactionType, setInteractionType] = useState<InteractionType>("follow_up");
  const [notes, setNotes] = useState("");
  const [docType, setDocType] = useState<"resume" | "cover_letter" | "job_description" | "interview_notes" | "offer_letter" | "other">("resume");
  const [libraryId, setLibraryId] = useState("");
  const [version, setVersion] = useState("");

  const submit = () => {
    if (kind === "application") {
      const result = createApplication(hub, {
        jobTitle,
        companyName: company,
        jobUrl,
        location,
        workArrangement: arrangement === "unknown" ? undefined : arrangement,
        source,
        appliedAt: appliedAt || undefined,
        stageId: appliedAt ? "applied" : stageId,
      });
      if (applyResult(result, onChange, flash, "Application saved")) close();
      return;
    }
    if (kind === "company") {
      if (!company.trim()) return flash?.("Company name is required.");
      onChange(upsertCompany(hub, { name: company, industry: role, location, notes }));
      flash?.("Company saved");
      close();
      return;
    }
    if (kind === "interview") {
      const startsIso = startsAt ? new Date(startsAt).toISOString() : "";
      const result = createInterview(hub, {
        applicationId,
        title: title || "Interview",
        startsAt: startsIso,
        interviewType,
        meetingUrl,
      });
      if (applyResult(result, onChange, flash, "Interview scheduled")) close();
      return;
    }
    if (kind === "contact") {
      const result = upsertContact(hub, {
        name,
        role,
        email,
        companyId: hub.companies.find((c) => c.name.toLowerCase() === company.trim().toLowerCase())?.id,
        notes,
      });
      if (applyResult(result, onChange, flash, "Contact saved")) close();
      return;
    }
    if (kind === "task") {
      const result = createTask(hub, { title, dueAt: dueAt || undefined, applicationId: applicationId || undefined });
      if (applyResult(result, onChange, flash, "Follow-up created")) close();
      return;
    }
    if (kind === "interaction") {
      onChange(
        recordInteraction(hub, {
          interactionType,
          applicationId: applicationId || undefined,
          notes,
        }),
      );
      flash?.("Interaction recorded");
      close();
      return;
    }
    if (kind === "document") {
      const result = linkDocument(hub, {
        title: title || "Document",
        documentType: docType,
        applicationId: applicationId || undefined,
        libraryDocumentId: libraryId || undefined,
        versionIdentifier: version || undefined,
        notes,
      });
      if (applyResult(result, onChange, flash, "Document linked")) close();
    }
  };

  return (
    <div className="modal-layer" onMouseDown={close}>
      <div className="capture-modal career-composer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="capture-head">
          <div>
            <strong>
              {kind === "application"
                ? "New application"
                : kind === "company"
                  ? "New company"
                  : kind === "interview"
                    ? "Schedule interview"
                    : kind === "contact"
                      ? "New contact"
                      : kind === "task"
                        ? "Create follow-up"
                        : kind === "interaction"
                          ? "Record interaction"
                          : "Link document"}
            </strong>
            <span>Only title + company are required for applications.</span>
          </div>
          <button type="button" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="career-composer-body">
          {(kind === "application" || kind === "company" || kind === "contact") && (
            <label className="career-field">
              Company
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Corp" />
            </label>
          )}
          {kind === "application" && (
            <>
              <label className="career-field">
                Job title
                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Software Engineer" />
              </label>
              <label className="career-field">
                Job URL
                <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://" />
              </label>
              <label className="career-field">
                Location
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </label>
              <label className="career-field">
                Arrangement
                <select value={arrangement} onChange={(e) => setArrangement(e.target.value as WorkArrangement)}>
                  <option value="unknown">Unknown</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </label>
              <label className="career-field">
                Source
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="LinkedIn, referral…" />
              </label>
              <label className="career-field">
                Date applied
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => {
                    setAppliedAt(e.target.value);
                    if (e.target.value) setStageId("applied");
                  }}
                />
              </label>
              <label className="career-field">
                Stage
                <select value={stageId} onChange={(e) => setStageId(e.target.value as CareerStageId)}>
                  {CAREER_STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(kind === "interview" || kind === "task" || kind === "interaction" || kind === "document") && (
            <label className="career-field">
              Application
              <select value={applicationId} onChange={(e) => setApplicationId(e.target.value)}>
                <option value="">Select…</option>
                {hub.applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.jobTitle} · {companyName(hub, a.companyId)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {kind === "interview" && (
            <>
              <label className="career-field">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Technical screen" />
              </label>
              <label className="career-field">
                Starts
                <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </label>
              <label className="career-field">
                Type
                <select value={interviewType} onChange={(e) => setInterviewType(e.target.value as InterviewType)}>
                  <option value="phone">Phone</option>
                  <option value="video">Video</option>
                  <option value="onsite">Onsite</option>
                  <option value="technical">Technical</option>
                  <option value="panel">Panel</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="career-field">
                Meeting link
                <input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} />
              </label>
            </>
          )}
          {kind === "contact" && (
            <>
              <label className="career-field">
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="career-field">
                Role
                <input value={role} onChange={(e) => setRole(e.target.value)} />
              </label>
              <label className="career-field">
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
            </>
          )}
          {kind === "task" && (
            <>
              <label className="career-field">
                Follow-up
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with recruiter" />
              </label>
              <label className="career-field">
                Due
                <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </label>
            </>
          )}
          {kind === "interaction" && (
            <>
              <label className="career-field">
                Type
                <select value={interactionType} onChange={(e) => setInteractionType(e.target.value as InteractionType)}>
                  <option value="email_received">Email received</option>
                  <option value="email_sent">Email sent</option>
                  <option value="phone_call">Phone call</option>
                  <option value="recruiter_screening">Recruiter screening</option>
                  <option value="interview">Interview</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="career-field">
                Notes
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </label>
            </>
          )}
          {kind === "document" && (
            <>
              <label className="career-field">
                Title
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resume — Product 2026" />
              </label>
              <label className="career-field">
                Type
                <select value={docType} onChange={(e) => setDocType(e.target.value as typeof docType)}>
                  <option value="resume">Résumé</option>
                  <option value="cover_letter">Cover letter</option>
                  <option value="job_description">Job description</option>
                  <option value="interview_notes">Interview notes</option>
                  <option value="offer_letter">Offer letter</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label className="career-field">
                Library document id
                <input value={libraryId} onChange={(e) => setLibraryId(e.target.value)} placeholder="note or resource id" />
              </label>
              <label className="career-field">
                Version identifier
                <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="resume-2026-03-12" />
              </label>
            </>
          )}
          {(kind === "company" || kind === "contact") && (
            <label className="career-field">
              Notes
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </label>
          )}
        </div>
        <div className="career-composer-actions">
          <button type="button" onClick={close}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={submit}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
