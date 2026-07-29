/**
 * PortfolioCard Component
 * Beautiful showcase display for portfolio projects
 */

import { ExternalLink, Github } from "lucide-react";
import type { PortfolioCardProps } from "./types";

export function PortfolioCard({
  project,
  metadata,
  onOpen,
}: PortfolioCardProps) {
  return (
    <div className="workos-portfolio-card">
      {metadata?.image && (
        <div
          className="card-image"
          style={{ backgroundImage: `url(${metadata.image})` }}
        >
          <div className="card-image-overlay" />
        </div>
      )}

      <div className="card-content">
        <div className="card-header">
          <div className="card-title">
            <strong>{project.name}</strong>
            {metadata?.featured && (
              <span className="featured-badge">⭐ Featured</span>
            )}
          </div>
        </div>

        {metadata?.description && (
          <p className="card-description">{metadata.description}</p>
        )}

        {metadata?.techStack && metadata.techStack.length > 0 && (
          <div className="tech-stack">
            {metadata.techStack.map((tech) => (
              <span key={tech} className="tech-badge">
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="card-actions">
          {metadata?.github && (
            <a
              href={metadata.github}
              target="_blank"
              rel="noopener noreferrer"
              className="action-link"
            >
              <Github size={14} />
              GitHub
            </a>
          )}
          {metadata?.website && (
            <a
              href={metadata.website}
              target="_blank"
              rel="noopener noreferrer"
              className="action-link"
            >
              <ExternalLink size={14} />
              Website
            </a>
          )}
          <button className="action-link primary" onClick={onOpen}>
            View Details
          </button>
        </div>
      </div>

      <style jsx>{`
        .workos-portfolio-card {
          background: white;
          border: 1px solid rgba(0, 0, 0, 0.06);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
          display: flex;
          flex-direction: column;
        }

        .workos-portfolio-card:hover {
          border-color: rgba(0, 0, 0, 0.1);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        }

        .card-image {
          height: 180px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          background-size: cover;
          background-position: center;
          position: relative;
          overflow: hidden;
        }

        .card-image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.3) 100%);
        }

        .card-content {
          padding: 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .card-header {
          display: flex;
          align-items: start;
          justify-content: space-between;
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .card-title strong {
          font-size: 15px;
          color: var(--text-primary);
        }

        .featured-badge {
          font-size: 11px;
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
          padding: 2px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .card-description {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }

        .tech-stack {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tech-badge {
          display: inline-block;
          font-size: 11px;
          background: rgba(98, 90, 246, 0.1);
          color: #625af6;
          padding: 4px 8px;
          border-radius: 4px;
          white-space: nowrap;
        }

        .card-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: auto;
        }

        .action-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          font-size: 12px;
          font-weight: 500;
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 4px;
          background: white;
          color: var(--text-primary);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
        }

        .action-link:hover {
          background: rgba(0, 0, 0, 0.02);
          border-color: rgba(0, 0, 0, 0.2);
        }

        .action-link.primary {
          flex: 1;
          background: rgba(98, 90, 246, 0.1);
          border-color: #625af6;
          color: #625af6;
        }

        .action-link.primary:hover {
          background: rgba(98, 90, 246, 0.2);
        }
      `}</style>
    </div>
  );
}
