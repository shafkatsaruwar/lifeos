'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { ContextAwareSidebar } from './ContextAwareSidebar';
import { ContextualSearch } from './ContextualSearch';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: string) => void;
}

export function ResponsiveLayout({ children, onNavigate }: ResponsiveLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || !isMobile) && (
          <motion.div
            className={`${isMobile ? 'fixed inset-y-0 left-0 z-40' : 'relative'} ${
              sidebarCollapsed && !isMobile ? 'w-20' : 'w-80 md:w-64 lg:w-72'
            }`}
            initial={isMobile ? { x: -280 } : { x: 0 }}
            animate={{ x: 0 }}
            exit={isMobile ? { x: -280 } : { x: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <ContextAwareSidebar
              isCollapsed={sidebarCollapsed && !isMobile}
              onNavigate={(view) => {
                onNavigate?.(view);
                if (isMobile) setSidebarOpen(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay for mobile */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-30"
            onClick={() => setSidebarOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.main
        className="flex-1 flex flex-col overflow-hidden"
        layout
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 gap-4">
          {/* Mobile Menu Button */}
          {isMobile && (
            <motion.button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {sidebarOpen ? (
                  <X key="close" className="w-6 h-6" />
                ) : (
                  <Menu key="menu" className="w-6 h-6" />
                )}
              </AnimatePresence>
            </motion.button>
          )}

          {/* Search */}
          <div className="flex-1 flex justify-center">
            <div className={isMobile ? 'w-full' : ''}>
              <ContextualSearch />
            </div>
          </div>

          {/* Desktop Sidebar Toggle */}
          {!isMobile && (
            <motion.button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Menu className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Content Area */}
        <motion.div
          className="flex-1 overflow-y-auto"
          layout
        >
          <motion.div
            className="w-full h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.main>
    </div>
  );
}
