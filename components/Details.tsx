'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface DetailsProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export default function Details({ title, children, defaultOpen = false }: DetailsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: '10px',
      overflow: 'hidden',
      marginBottom: '12px'
    }}>
      <motion.button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ink)',
          fontSize: '13px',
          fontWeight: 600,
          textAlign: 'left',
          transition: 'background 0.2s'
        }}
        whileHover={{ background: 'var(--canvas)' }}
      >
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <ChevronDown size={16} />
        </motion.div>
        {title}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              overflow: 'hidden',
              borderTop: '1px solid var(--line)',
              background: 'color-mix(in srgb, var(--canvas) 50%, transparent)'
            }}
          >
            <div style={{ padding: '12px 14px', fontSize: '12px', lineHeight: '1.6', color: 'var(--ink)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
