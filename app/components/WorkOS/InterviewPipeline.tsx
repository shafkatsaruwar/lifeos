/**
 * InterviewPipeline Component
 * Kanban-style interview/application pipeline visualization
 */

import { ChevronRight, Plus } from "lucide-react";
import type { InterviewPipelineProps } from "./types";

export function InterviewPipeline({
  applications,
  stages,
  onOpen,
}: InterviewPipelineProps) {
  const defaultStages = [
    "Prospect",
    "Applied",
    "Phone Screen",
    "Technical",
    "Final Round",
    "Offer",
    "Rejected",
  ];

  const stageList = stages || defaultStages;

  const appsByStage = stageList.reduce(
    (acc, stage) => {
      acc[stage] = applications.filter((app) => {
        const desc = (app.desc || "").toLowerCase();
        return desc.includes(stage.toLowerCase());
      });
      return acc;
    },
    {} as Record<string, typeof applications>
  );

  const totalApplications = applications.length;

  return (
    <div className="workos-interview-pipeline">
      <div className="pipeline-header">
        <div>
          <h3>Interview Pipeline</h3>
          <p>{totalApplications} applications in progress</p>
        </div>
      </div>

      <div className="pipeline-container">
        {stageList.map((stage) => (
          <div key={stage} className="pipeline-column">
            <div className="column-header">
              <h4>{stage}</h4>
              <span className="count">{appsByStage[stage]?.length || 0}</span>
            </div>

            <div className="column-cards">
              {appsByStage[stage]?.length ? (
                appsByStage[stage].map((app) => (
                  <button
                    key={app.name}
                    className="pipeline-card"
                    onClick={() => onOpen?.(app.name)}
                  >
                    <div className="card-dot" style={{ background: app.color }} />
                    <div className="card-content">
                      <strong>{app.name}</strong>
                      {app.desc && (
                        <p>{app.desc.slice(0, 40)}...</p>
                      )}
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))
              ) : (
                <div className="column-empty">No applications</div>
              )}
            </div>

            <button className="add-card">
              <Plus size={14} />
              Add
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .workos-interview-pipeline {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pipeline-header {
          padding: 0 2px;
        }

        .pipeline-header h3 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .pipeline-header p {
          margin: 0;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .pipeline-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .pipeline-column {
          background: rgba(0, 0, 0, 0.02);
          border: 1px solid rgba(0, 0, 0, 0.04);
          border-radius: 8px;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 240px;
        }

        .column-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
        }

        .column-header h4 {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-secondary);
        }

        .count {
          font-size: 12px;
          font-weight: 600;
          color: #625af6;
          background: rgba(98, 90, 246, 0.1);
          padding: 2px 6px;
          border-radius: 3px;
        }

        .column-cards {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 100px;
          flex: 1;
        }

        .pipeline-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 6px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          text-align: left;
        }

        .pipeline-card:hover {
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }

        .card-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .card-content {
          flex: 1;
          min-width: 0;
        }

        .card-content strong {
          display: block;
          font-size: 12px;
          color: var(--text-primary);
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .card-content p {
          margin: 0;
          font-size: 10px;
          color: var(--text-secondary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .pipeline-card svg {
          opacity: 0;
          transition: opacity 0.2s;
          flex-shrink: 0;
        }

        .pipeline-card:hover svg {
          opacity: 1;
        }

        .column-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 60px;
          font-size: 12px;
          color: var(--text-secondary);
          opacity: 0.5;
        }

        .add-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border: 1px dashed rgba(0, 0, 0, 0.1);
          border-radius: 6px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-card:hover {
          border-color: rgba(0, 0, 0, 0.2);
          background: rgba(0, 0, 0, 0.02);
          color: var(--text-primary);
        }

        @media (max-width: 1024px) {
          .pipeline-container {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          }

          .pipeline-column {
            min-width: 200px;
          }
        }
      `}</style>
    </div>
  );
}
