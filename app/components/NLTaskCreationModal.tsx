'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Brain, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNLTaskCreation, ParsedTask, NLTaskResult } from '@/lib/useNLTaskCreation';
import { formatDueDate } from '@/lib/helpers';

interface NLTaskCreationModalProps {
  close: () => void;
  onSubmit: (task: ParsedTask) => void;
  existingTasks: any[];
  existingProjects: any[];
}

export function NLTaskCreationModal({
  close,
  onSubmit,
  existingTasks,
  existingProjects,
}: NLTaskCreationModalProps) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<NLTaskResult | null>(null);
  const [step, setStep] = useState<'input' | 'review'>('input');
  const { parseNaturalLanguage, loading, error } = useNLTaskCreation();

  const handleParse = async () => {
    if (!input.trim()) return;

    const parseResult = await parseNaturalLanguage(
      input,
      existingTasks,
      existingProjects
    );

    if (parseResult) {
      setResult(parseResult);
      setStep('review');
    }
  };

  const handleSubmit = () => {
    if (result?.task) {
      onSubmit(result.task);
      close();
    }
  };

  const handleEdit = (field: keyof ParsedTask, value: any) => {
    if (result) {
      setResult({
        ...result,
        task: {
          ...result.task,
          [field]: value,
        },
      });
    }
  };

  return (
    <motion.div
      className="modal-layer"
      onMouseDown={close}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="create-modal"
        onMouseDown={e => e.stopPropagation()}
        initial={{ scale: 0.98, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        style={{ maxWidth: '600px' }}
      >
        <div className="capture-head">
          <div className="brain-dot">
            <Brain size={16} />
          </div>
          <div>
            <strong>Create Task with AI</strong>
            <span>
              {step === 'input'
                ? 'Tell LifeOS what you need to do'
                : 'Review and confirm your task'}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'input' && (
          <div style={{ padding: '16px' }}>
            <label htmlFor="nl-input" style={{ display: 'block', marginBottom: '8px' }}>
              What do you need to do?
            </label>
            <textarea
              id="nl-input"
              autoFocus
              placeholder="e.g., 'Schedule me time tomorrow at 2pm to work on the Q3 roadmap for 90 minutes'"
              value={input}
              onChange={e => setInput(e.target.value)}
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid var(--line)',
                fontFamily: 'inherit',
                fontSize: '14px',
                resize: 'vertical',
              }}
            />
            {error && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#ff44441a',
                  color: 'var(--error)',
                  fontSize: '13px',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {step === 'review' && result && (
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {result.conflictCount > 0 && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#ff944421',
                  border: '1px solid #ff9444',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'flex-start',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#ff9444' }} />
                <div>
                  <strong style={{ color: '#ff9444' }}>Time conflict</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                    You have {result.conflictCount} other task(s) at this time. Review your calendar before confirming.
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Title
                </label>
                <input
                  type="text"
                  value={result.task.title}
                  onChange={e => handleEdit('title', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Project
                </label>
                <input
                  type="text"
                  value={result.task.project}
                  onChange={e => handleEdit('project', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Due Date
                </label>
                <input
                  type="text"
                  value={formatDueDate(result.task.due)}
                  disabled
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                    background: 'var(--bg)',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Time
                </label>
                <input
                  type="text"
                  value={result.task.startTime || 'No specific time'}
                  onChange={e => handleEdit('startTime', e.target.value || undefined)}
                  placeholder="HH:MM (optional)"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Priority
                </label>
                <select
                  value={result.task.priority}
                  onChange={e => handleEdit('priority', e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Energy Level
                </label>
                <select
                  value={result.task.energy}
                  onChange={e => handleEdit('energy', e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                  Focus Minutes
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={result.task.focusMinutes}
                  onChange={e => handleEdit('focusMinutes', parseInt(e.target.value) || 45)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="create-actions">
          {step === 'input' && (
            <>
              <button type="button" onClick={close}>
                Cancel
              </button>
              <button
                className="primary"
                onClick={handleParse}
                disabled={!input.trim() || loading}
              >
                {loading ? 'Thinking...' : 'Turn into a task'}
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button
                type="button"
                onClick={() => {
                  setStep('input');
                  setResult(null);
                }}
              >
                Back
              </button>
              <button className="primary" onClick={handleSubmit}>
                Create Task
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
