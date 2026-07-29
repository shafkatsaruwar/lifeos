/**
 * SkillCard Component
 * Display skill with proficiency, projects, and next steps
 */

import { BookOpen, TrendingUp } from "lucide-react";
import type { SkillCardProps } from "./types";

export function SkillCard({
  name,
  proficiency,
  projectCount,
  certifications,
  nextStep,
  onOpen,
}: SkillCardProps) {
  const proficiencyLevels = {
    Beginner: 25,
    Intermediate: 50,
    Advanced: 75,
    Expert: 100,
  };

  const proficiencyValue = proficiencyLevels[proficiency];

  return (
    <div className="workos-skill-card" onClick={onOpen}>
      <div className="card-header">
        <div className="skill-name">
          <strong>{name}</strong>
        </div>
        <span className="proficiency-label">{proficiency}</span>
      </div>

      <div className="proficiency-bar">
        <div
          className="proficiency-fill"
          style={{ width: `${proficiencyValue}%` }}
        />
      </div>

      <div className="card-stats">
        <div className="stat">
          <span className="stat-icon">📦</span>
          <span className="stat-text">{projectCount} project{projectCount !== 1 ? "s" : ""}</span>
        </div>
        {certifications && certifications.length > 0 && (
          <div className="stat">
            <span className="stat-icon">🎓</span>
            <span className="stat-text">{certifications.length} cert{certifications.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {certifications && certifications.length > 0 && (
        <div className="certifications">
          {certifications.map((cert) => (
            <span key={cert} className="cert-badge">
              {cert}
            </span>
          ))}
        </div>
      )}

      {nextStep && (
        <div className="next-step">
          <TrendingUp size={14} />
          <span>{nextStep}</span>
        </div>
      )}

      <style jsx>{`
        .workos-skill-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .workos-skill-card:hover {
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }

        .skill-name strong {
          font-size: 14px;
          color: var(--text-primary);
        }

        .proficiency-label {
          font-size: 11px;
          font-weight: 600;
          color: #625af6;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .proficiency-bar {
          height: 4px;
          background: rgba(0, 0, 0, 0.04);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .proficiency-fill {
          height: 100%;
          background: linear-gradient(90deg, #625af6, #4b8bdc);
          transition: width 0.3s ease;
        }

        .card-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 10px;
          font-size: 12px;
        }

        .stat {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-secondary);
        }

        .stat-icon {
          font-size: 13px;
        }

        .stat-text {
          font-weight: 500;
        }

        .certifications {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-bottom: 8px;
        }

        .cert-badge {
          display: inline-block;
          font-size: 10px;
          background: rgba(100, 200, 100, 0.1);
          color: #47a47b;
          padding: 2px 6px;
          border-radius: 3px;
          white-space: nowrap;
        }

        .next-step {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          background: rgba(98, 90, 246, 0.05);
          border-radius: 4px;
          font-size: 12px;
          color: #625af6;
        }

        .next-step svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
