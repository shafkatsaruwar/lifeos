'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Briefing from '@/components/Briefing';
import {
  PersonalMemory,
  PersonalContext,
  DailyBriefing,
  mockMemory,
  generateMockObservations,
  buildContext,
  reasonAboutRecommendation,
  Observation
} from '@/lib/lifeos-kernel';
import { Settings, Menu, ChevronDown } from 'lucide-react';

type View = 'briefing' | 'modules' | 'settings';

export default function LifeOS() {
  const [currentView, setCurrentView] = useState<View>('briefing');
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [memory] = useState<PersonalMemory>(mockMemory);
  const [context, setContext] = useState<PersonalContext | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);

  // Initialize the kernel
  useEffect(() => {
    const obs = generateMockObservations();
    setObservations(obs);

    const ctx = buildContext(obs, memory);
    setContext(ctx);

    const brief = reasonAboutRecommendation(memory, ctx, obs);
    setBriefing(brief);
  }, [memory]);

  if (!briefing || !context) {
    return (
      <div className="lifeos-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="lifeos-container">
      {/* Header */}
      <header className="lifeos-header">
        <div className="header-left">
          <h1>LifeOS</h1>
        </div>
        <div className="header-right">
          <button
            className="header-button"
            onClick={() => setCurrentView('modules')}
            title="Modules"
          >
            <Menu size={20} />
          </button>
          <button
            className="header-button"
            onClick={() => setCurrentView('settings')}
            title="Settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="lifeos-main">
        <AnimatePresence mode="wait">
          {currentView === 'briefing' && briefing && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="view-content"
            >
              <Briefing
                briefing={briefing}
                onOpenModule={(module) => {
                  console.log('Opening module:', module);
                  // TODO: Route to module view
                }}
              />
            </motion.div>
          )}

          {currentView === 'modules' && (
            <motion.div
              key="modules"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="view-content modules-view"
            >
              <h2>Modules</h2>
              <div className="modules-grid">
                {['Synapse', 'Photography', 'Career', 'Masters', 'Finance', 'Learning'].map(
                  (module) => (
                    <motion.button
                      key={module}
                      className="module-card"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => console.log('Open module:', module)}
                    >
                      <div className="module-name">{module}</div>
                      <ChevronDown size={16} />
                    </motion.button>
                  )
                )}
              </div>

              <div className="context-display">
                <h3>Current Context</h3>
                <div className="context-section">
                  <h4>Active Seasons</h4>
                  <ul>
                    {context.inferredSeasons.map((s, i) => (
                      <li key={i}>{s.season} ({Math.round(s.confidence * 100)}%)</li>
                    ))}
                  </ul>
                </div>

                <div className="context-section">
                  <h4>Current Roles</h4>
                  <ul>
                    {context.inferredRoles.map((r, i) => (
                      <li key={i}>
                        {r.role} ({r.focus})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="context-section">
                  <h4>Observations</h4>
                  <ul>
                    {observations.slice(0, 8).map((o) => (
                      <li key={o.id}>
                        <strong>{o.module}:</strong> {o.fact}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="view-content settings-view"
            >
              <h2>Settings</h2>
              <p>Settings coming soon.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="lifeos-nav">
        <button
          className={`nav-button ${currentView === 'briefing' ? 'active' : ''}`}
          onClick={() => setCurrentView('briefing')}
        >
          Briefing
        </button>
        <button
          className={`nav-button ${currentView === 'modules' ? 'active' : ''}`}
          onClick={() => setCurrentView('modules')}
        >
          Explore
        </button>
      </nav>
    </div>
  );
}
