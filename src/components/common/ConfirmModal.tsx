import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from '../LanguageProvider';
import { useEffect } from 'react';

interface Props {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText, cancelText }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter') onConfirm();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{ zIndex: 1100 }}
          />
          <motion.div 
            className="modal-content glass-panel"
            initial={{ scale: 0.9, opacity: 0, y: 20, x: '-50%', top: '50%' }}
            animate={{ scale: 1, opacity: 1, y: '-50%', x: '-50%', top: '50%' }}
            exit={{ scale: 0.9, opacity: 0, y: 20, x: '-50%', top: '50%' }}
            style={{ 
              position: 'fixed',
              left: '50%',
              maxWidth: '400px', 
              zIndex: 1101,
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', color: 'var(--danger)' }}>
                  <AlertTriangle size={24} />
                </div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
                  {title || t('confirmAction') || 'Confirm Action'}
                </h2>
              </div>
              <button onClick={onCancel} className="action-icon" style={{ border: 'none', background: 'transparent', margin: '-8px -8px 0 0' }}>
                <X size={20} />
              </button>
            </div>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '24px' }}>
              {message}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-outline" onClick={onCancel}>
                {cancelText || t('cancel')}
              </button>
              <button className="btn btn-danger" onClick={onConfirm} autoFocus>
                {confirmText || t('delete') || 'Delete'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
