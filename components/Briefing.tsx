'use client';

import { DailyBriefing, Recommendation } from '@/lib/lifeos-kernel';
import { motion } from 'framer-motion';
import { ChevronRight, AlertCircle, Clock, Zap } from 'lucide-react';

interface BriefingProps {
  briefing: DailyBriefing;
  onOpenModule?: (module: string) => void;
}

export default function Briefing({ briefing, onOpenModule }: BriefingProps) {
  return (
    <motion.div
      className="briefing-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Greeting */}
      <div className="briefing-greeting">
        <motion.h1
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          {briefing.greeting}
        </motion.h1>
      </div>

      {/* Primary Recommendation */}
      {briefing.primaryRecommendation && (
        <motion.div
          className="primary-recommendation"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="recommendation-header">
            <Zap size={20} className="recommendation-icon" />
            <div className="recommendation-title">
              <h2>Today I'd focus on {briefing.primaryRecommendation.module}.</h2>
            </div>
          </div>

          <p className="recommendation-why">
            {briefing.primaryRecommendation.why}
          </p>

          <div className="recommendation-reasoning">
            <div className="reasoning-item">
              <span className="reasoning-label">Why:</span>
              <span>{briefing.primaryRecommendation.reasoning.momentumFactor}</span>
            </div>
            <div className="reasoning-item">
              <span className="reasoning-label">Time:</span>
              <span>{briefing.primaryRecommendation.reasoning.timeAvailable}</span>
            </div>
            {briefing.primaryRecommendation.reasoning.constraints.length > 0 && (
              <div className="reasoning-item">
                <span className="reasoning-label">Note:</span>
                <span>{briefing.primaryRecommendation.reasoning.constraints[0]}</span>
              </div>
            )}
          </div>

          <motion.button
            className="primary-action"
            onClick={() => onOpenModule?.(briefing.primaryRecommendation?.module || '')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {briefing.primaryRecommendation.action}
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      )}

      {/* Secondary Items */}
      <motion.div
        className="secondary-items"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3>You also have:</h3>
        <div className="items-list">
          {briefing.secondaryItems.map((item, index) => (
            <motion.div
              key={index}
              className="secondary-item"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <div className="item-icon">
                {item.type === 'deadline' && <Clock size={16} />}
                {item.type === 'waiting' && <AlertCircle size={16} />}
                {item.type === 'pattern' && <Zap size={16} />}
                {item.type === 'opportunity' && <ChevronRight size={16} />}
              </div>
              <p>{item.message}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Closing */}
      <motion.div
        className="briefing-closing"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <p>Everything else can wait.</p>
      </motion.div>
    </motion.div>
  );
}
