'use client';

import { DailyBriefing } from '@/lib/lifeos-kernel';
import { motion } from 'framer-motion';
import { ChevronRight, AlertCircle, Zap } from 'lucide-react';

interface BriefingProps {
  briefing: DailyBriefing;
  onOpenModule?: (module: string) => void;
}

export default function Briefing({ briefing, onOpenModule }: BriefingProps) {
  return (
    <motion.div
      className="page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Welcome Section */}
      <div className="welcome">
        <div>
          <p className="eyebrow">Daily Briefing</p>
          <h1>{briefing.greeting}</h1>
          <p>{briefing.explanation}</p>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="dashboard-grid">
        {/* Primary Recommendation - Left Column */}
        {briefing.primaryRecommendation && (
          <motion.div
            className="card"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="card-head">
              <div>
                <div className="section-icon violet">
                  <Zap size={16} />
                </div>
                <h2>Focus Today</h2>
              </div>
            </div>

            <div style={{ padding: '18px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 700 }}>
                {briefing.primaryRecommendation.module}
              </h3>

              <p style={{ fontSize: '12px', lineHeight: '1.6', marginBottom: '16px', color: 'var(--muted)' }}>
                {briefing.primaryRecommendation.why}
              </p>

              <div style={{
                background: 'var(--canvas)',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '14px',
                fontSize: '10px',
                lineHeight: '1.6',
                display: 'grid',
                gap: '8px'
              }}>
                <div>
                  <span style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '8px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Why</span>
                  <div style={{ fontSize: '11px' }}>
                    {briefing.primaryRecommendation.reasoning.momentumFactor}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', textTransform: 'uppercase', fontSize: '8px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Time</span>
                  <div style={{ fontSize: '11px' }}>
                    {briefing.primaryRecommendation.reasoning.timeAvailable}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onOpenModule?.(briefing.primaryRecommendation!.module)}
                className="primary"
                style={{ width: '100%' }}
              >
                {briefing.primaryRecommendation.action}
                <ChevronRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {/* Secondary Items - Right Column */}
        <motion.div
          className="card"
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="card-head">
            <div>
              <div className="section-icon blue">
                <AlertCircle size={16} />
              </div>
              <h2>Also Notice</h2>
            </div>
          </div>

          <div style={{ padding: '0' }}>
            {briefing.secondaryItems.map((item, index) => (
              <div
                key={index}
                style={{
                  borderBottom: index < briefing.secondaryItems.length - 1 ? '1px solid var(--line)' : 'none',
                  padding: '14px 18px',
                  fontSize: '11px',
                  lineHeight: '1.5'
                }}
              >
                <p style={{ margin: 0 }}>{item.message}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
