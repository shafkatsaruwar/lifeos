/**
 * MomentumSection Component
 * Display projects grouped by momentum level
 */

import { ProjectCard } from "./ProjectCard";
import type { ProjectCardProps, MomentumSectionProps } from "./types";

export function MomentumSection({
  projects,
  momentum,
  onOpen,
}: MomentumSectionProps) {
  if (!momentum || projects.length === 0) return null;

  const momentumLabels = {
    high: "🔥 High momentum",
    medium: "⭐ Medium momentum",
    dormant: "😴 Dormant",
    blocked: "⏸️ Blocked",
  };

  const momentumDescriptions = {
    high: "Moving fast with recent activity and completions.",
    medium: "Steady progress with regular attention.",
    dormant: "Inactive for 2+ weeks. Consider a kickstart.",
    blocked: "Stalled with incomplete tasks and no recent progress.",
  };

  return (
    <div className="workos-momentum-section">
      <div className="momentum-header">
        <h3>{momentumLabels[momentum]}</h3>
        <p>{momentumDescriptions[momentum]}</p>
      </div>

      <div className="momentum-grid">
        {projects.map((project) => (
          <ProjectCard
            key={project.name}
            project={project}
            momentum={momentum}
            onOpen={() => onOpen?.(project.name)}
            linkedTasksCount={project.tasks}
          />
        ))}
      </div>

      <style jsx>{`
        .workos-momentum-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .momentum-header {
          padding: 0 2px;
        }

        .momentum-header h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .momentum-header p {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .momentum-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }

        @media (max-width: 768px) {
          .momentum-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
