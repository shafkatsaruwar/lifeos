"use client";

import {
  BookOpen,
  Building2,
  DollarSign,
  FileText,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Target,
  TrendingUp,
  Award,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type { StudyAbroadHub } from "@/lib/studyAbroadTypes";
import { upcomingDeadlines, countApplicationsByStatus, getUniversityById } from "@/lib/studyAbroadHelpers";

function Section({
  icon: Icon,
  title,
  action,
  onAction,
  children,
  className = "",
}: {
  icon: typeof BookOpen;
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`os-module ${className}`}>
      <header>
        <div>
          <Icon size={17} />
          <h2>{title}</h2>
        </div>
        {action && (
          <button onClick={onAction}>
            {action}
            <ChevronRight size={14} />
          </button>
        )}
      </header>
      <div className="os-module-body">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="os-empty">
      <GraduationCap size={19} />
      <p>{children}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: typeof BookOpen;
  color?: string;
}) {
  return (
    <div className="study-stat-card" style={color ? { "--accent-color": color } as any : {}}>
      <Icon size={16} style={color ? { color } : {}} />
      <span>{label}</span>
      <strong style={color ? { color } : {}}>{value}</strong>
    </div>
  );
}

export function StudyAbroadDashboard({
  hub,
  onOpenUniversities,
  onOpenPrograms,
  onOpenApplications,
  onOpenScholarships,
  onOpenDocuments,
  onOpenTimeline,
  personalContextMessage,
}: {
  hub: StudyAbroadHub;
  onOpenUniversities: () => void;
  onOpenPrograms: () => void;
  onOpenApplications: () => void;
  onOpenScholarships: () => void;
  onOpenDocuments: () => void;
  onOpenTimeline: () => void;
  personalContextMessage?: string;
}) {
  const submitted = countApplicationsByStatus(hub, "submitted");
  const awaiting = countApplicationsByStatus(hub, "awaiting_response");
  const offers = countApplicationsByStatus(hub, "offer");
  const rejected = countApplicationsByStatus(hub, "rejected");
  const deadlines = upcomingDeadlines(hub);
  const blockedDocs = hub.documents.filter((d) => d.status === "blocked");
  const nextDeadline = deadlines[0];

  const totalTuitionExposure = hub.programs.reduce((sum, p) => {
    if (p.tuitionAmount) {
      const freq = p.tuitionFrequency === "total" ? 1 : p.tuitionFrequency === "annual" ? 1 : p.tuitionFrequency === "semester" ? 2 : 12;
      return sum + (p.tuitionAmount * freq);
    }
    return sum;
  }, 0);

  const livingCostRange = hub.programs.reduce(
    (range, p) => {
      if (p.estimatedMonthlyLivingCostMin) {
        range.min = Math.min(range.min || Infinity, p.estimatedMonthlyLivingCostMin);
      }
      if (p.estimatedMonthlyLivingCostMax) {
        range.max = Math.max(range.max || 0, p.estimatedMonthlyLivingCostMax);
      }
      return range;
    },
    { min: 0, max: 0 } as { min: number; max: number }
  );

  return (
    <div className="os-dashboard study-abroad-dashboard">
      <div className="os-hero">
        <div>
          <p className="eyebrow">Study Abroad</p>
          <h1>Master&rsquo;s Application Tracker</h1>
          <p>{hub.programs.length} program(s) researched · {hub.applications.length} application(s)</p>
        </div>
        <button className="os-profile-button" onClick={onOpenTimeline}>
          <Calendar size={18} />
          <span>Timeline</span>
        </button>
      </div>

      <div className="os-quick-row">
        <button className="os-quick-action" onClick={onOpenUniversities}>
          <Building2 size={17} />
          <span>Universities</span>
        </button>
        <button className="os-quick-action" onClick={onOpenPrograms}>
          <BookOpen size={17} />
          <span>Programs</span>
        </button>
        <button className="os-quick-action" onClick={onOpenApplications}>
          <FileText size={17} />
          <span>Applications</span>
        </button>
        <button className="os-quick-action" onClick={onOpenScholarships}>
          <Award size={17} />
          <span>Scholarships</span>
        </button>
        <button className="os-quick-action" onClick={onOpenDocuments}>
          <GraduationCap size={17} />
          <span>Documents</span>
        </button>
      </div>

      <div className="os-dashboard-grid">
        <div className="os-dashboard-main">
          {personalContextMessage && (
            <Section icon={Target} title="What should you know today?">
              <div className="study-context-card">
                <AlertCircle size={18} />
                <p>{personalContextMessage}</p>
              </div>
            </Section>
          )}

          <div className="study-stat-grid">
            <StatCard label="Programs researched" value={hub.programs.length} icon={BookOpen} color="#7c3aed" />
            <StatCard label="Applications in progress" value={hub.applications.filter((a) => ["preparing", "ready_to_submit", "blocked"].includes(a.status)).length} icon={Clock3} color="#f59e0b" />
            <StatCard label="Submitted" value={submitted} icon={FileText} color="#3b82f6" />
            <StatCard label="Offers received" value={offers} icon={CheckCircle2} color="#10b981" />
            <StatCard label="Rejections" value={rejected} icon={AlertCircle} color="#ef4444" />
            <StatCard label="Upcoming deadlines" value={deadlines.length} icon={Calendar} color="#8b5cf6" />
            <StatCard label="Scholarships tracked" value={hub.scholarships.length} icon={Award} color="#ec4899" />
            <StatCard label="Blocked by documents" value={hub.applications.filter((a) => a.status === "blocked").length} icon={AlertCircle} color="#f97316" />
            {totalTuitionExposure > 0 && <StatCard label="Est. tuition exposure" value={`€${Math.round(totalTuitionExposure / 1000)}k`} icon={DollarSign} color="#06b6d4" />}
            {livingCostRange.max > 0 && (
              <StatCard label="Monthly living cost" value={`€${livingCostRange.min}-${livingCostRange.max}`} icon={DollarSign} color="#14b8a6" />
            )}
          </div>

          <Section icon={Calendar} title="Upcoming deadlines" action={deadlines.length > 0 ? "All deadlines" : undefined} onAction={onOpenTimeline}>
            {deadlines.length ? (
              <div className="study-deadline-list">
                {deadlines.slice(0, 5).map((deadline) => (
                  <div key={`${deadline.deadline}-${deadline.type}`} className="study-deadline-item">
                    <span className="study-deadline-days">{deadline.daysUntil}d</span>
                    <span>
                      <strong>{deadline.title}</strong>
                      <small>{deadline.type} · {new Date(deadline.deadline).toLocaleDateString()}</small>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty>No upcoming deadlines. Check back later.</Empty>
            )}
          </Section>

          {blockedDocs.length > 0 && (
            <Section icon={AlertCircle} title="Blocked documents">
              <div className="study-blocked-docs">
                {blockedDocs.map((doc) => (
                  <div key={doc.id} className="study-blocked-item">
                    <AlertCircle size={16} />
                    <span>
                      <strong>{doc.name}</strong>
                      <small>{doc.blockingReason}</small>
                      {doc.amountNeededToResolve && (
                        <small style={{ color: "var(--accent)" }}>
                          {doc.currency || "EUR"} {doc.amountNeededToResolve} needed
                        </small>
                      )}
                    </span>
                    <button onClick={onOpenDocuments}>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>

        <aside className="os-dashboard-side">
          <Section icon={TrendingUp} title="Progress">
            <div className="study-progress-list">
              <div>
                <span>Researching</span>
                <strong>{countApplicationsByStatus(hub, "researching")}</strong>
              </div>
              <div>
                <span>In progress</span>
                <strong>{hub.applications.filter((a) => ["preparing", "ready_to_submit", "blocked"].includes(a.status)).length}</strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>{submitted}</strong>
              </div>
              <div>
                <span>Awaiting response</span>
                <strong>{awaiting}</strong>
              </div>
              <div>
                <span>Offers</span>
                <strong style={{ color: "#10b981" }}>{offers}</strong>
              </div>
              <div>
                <span>Rejected</span>
                <strong style={{ color: "#ef4444" }}>{rejected}</strong>
              </div>
            </div>
          </Section>

          {nextDeadline && (
            <Section icon={Clock3} title="Next deadline">
              <div className="study-next-deadline">
                <span className="days">{nextDeadline.daysUntil}</span>
                <div>
                  <strong>{nextDeadline.title}</strong>
                  <small>{new Date(nextDeadline.deadline).toLocaleDateString()}</small>
                </div>
              </div>
            </Section>
          )}

          {hub.scholarships.length > 0 && (
            <Section icon={Award} title="Scholarships">
              <div className="study-scholarship-summary">
                <p>{hub.scholarships.filter((s) => s.status === "awarded").length} awarded</p>
                <p>{hub.scholarships.filter((s) => s.status === "submitted").length} pending</p>
                <p>{hub.scholarships.filter((s) => ["researching", "eligible", "possibly_eligible"].includes(s.status)).length} available</p>
              </div>
            </Section>
          )}
        </aside>
      </div>
    </div>
  );
}
