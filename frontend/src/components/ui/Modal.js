import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Animated Modal with overlay, accessible escape key handling.
 * On mobile (≤ 768px): renders as a bottom-sheet sliding up from the bottom.
 * On desktop: renders as a centered popup with scale animation.
 */
export default function Modal({ isOpen, onClose, title, children, footer, size = 'md' }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const desktopVariants = {
    initial: { opacity: 0, scale: 0.95, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 10 },
  };

  const mobileVariants = {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          style={isMobile ? { alignItems: 'flex-end', padding: 0 } : {}}
        >
          <motion.div
            className="modal-content"
            style={isMobile ? {
              maxWidth: '100%',
              width: '100%',
              maxHeight: '90vh',
              borderRadius: '24px 24px 0 0',
            } : {
              maxWidth: size === 'lg' ? 640 : size === 'sm' ? 380 : 480,
            }}
            variants={isMobile ? mobileVariants : desktopVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={isMobile
              ? { type: 'tween', duration: 0.25, ease: 'easeOut' }
              : { duration: 0.2 }
            }
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            {/* Pull handle indicator on mobile */}
            {isMobile && (
              <div style={{
                display: 'flex', justifyContent: 'center', padding: '12px 0 0 0'
              }}>
                <div style={{
                  width: '36px', height: '4px', borderRadius: '2px',
                  background: 'var(--color-gray-300)'
                }} />
              </div>
            )}
            <div className="modal-header">
              <h2>{title}</h2>
              <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && (
              <div className="modal-footer" style={isMobile ? {
                flexDirection: 'column-reverse',
                gap: 'var(--space-2)',
                paddingBottom: 'calc(var(--space-4) + env(safe-area-inset-bottom, 8px))'
              } : {}}>
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
