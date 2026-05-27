'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, File, CheckCircle, AlertCircle } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { getPresignedUrl, initMultipartUpload, getMultipartPresignedUrl, completeMultipartUpload } from '@/lib/api';
import axios from 'axios';
import { useTranslation } from './LanguageProvider';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: R2Config;
  onSuccess: () => void;
}

interface UploadTask {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export default function UploadModal({ isOpen, onClose, config, onSuccess }: Props) {
  const { t } = useTranslation();
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processUpload = async (task: UploadTask) => {
    try {
      const file = task.file;
      const key = file.name;
      const contentType = file.type || 'application/octet-stream';

      if (file.size <= CHUNK_SIZE) {
        // Simple upload
        const url = await getPresignedUrl(config, key, contentType);
        await axios.put(url, file, {
          headers: { 'Content-Type': contentType },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: percentCompleted } : t));
          }
        });
      } else {
        // Multipart upload
        const uploadId = await initMultipartUpload(config, key, contentType);
        const totalParts = Math.ceil(file.size / CHUNK_SIZE);
        const parts: { partNumber: number, eTag: string }[] = [];

        for (let i = 0; i < totalParts; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);
          const partNumber = i + 1;

          const url = await getMultipartPresignedUrl(config, key, uploadId, partNumber);
          
          const res = await axios.put(url, chunk, {
            headers: { 'Content-Type': contentType },
            onUploadProgress: (progressEvent) => {
              const loadedTotal = start + progressEvent.loaded;
              const percentCompleted = Math.round((loadedTotal * 100) / file.size);
              setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: percentCompleted } : t));
            }
          });

          // ETag is returned in headers. S3 ETags are enclosed in quotes.
          const eTag = res.headers['etag'];
          parts.push({ partNumber, eTag: eTag.replace(/"/g, '') });
        }

        await completeMultipartUpload(config, key, uploadId, parts);
      }

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'success', progress: 100 } : t));
      onSuccess();
    } catch (error: any) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'error', error: error.message } : t));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newTasks = Array.from(e.dataTransfer.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: 'pending' as const
      }));
      
      setTasks(prev => [...prev, ...newTasks]);
      
      newTasks.forEach(task => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading' } : t));
        processUpload(task);
      });
    }
  }, [config, onSuccess]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newTasks = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        progress: 0,
        status: 'pending' as const
      }));
      
      setTasks(prev => [...prev, ...newTasks]);
      
      newTasks.forEach(task => {
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'uploading' } : t));
        processUpload(task);
      });
    }
    // reset input
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="modal-content glass-panel"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            style={{ maxWidth: '600px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
                  <UploadCloud size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{t('upload')}</h2>
              </div>
              <button onClick={onClose} className="btn-outline" style={{ border: 'none', padding: '8px' }}>
                <X size={20} />
              </button>
            </div>

            <div 
              className={`upload-dropzone ${isDragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadCloud size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 16px', opacity: 0.5 }} />
              <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{t('dragDrop')}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
                {t('supportsLarge')}
              </p>
              
              <input
                type="file"
                multiple
                id="file-upload"
                style={{ display: 'none' }}
                onChange={handleFileSelect}
              />
              <label htmlFor="file-upload" className="btn btn-primary">
                {t('browseFiles')}
              </label>
            </div>

            {tasks.length > 0 && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('uploadQueue')}</h4>
                {tasks.map(task => (
                  <div key={task.id} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <File size={16} color="var(--accent)" />
                        <span style={{ fontSize: '14px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {task.file.name}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {(task.file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                        {task.status === 'success' && <CheckCircle size={16} color="var(--success)" />}
                        {task.status === 'error' && <AlertCircle size={16} color="var(--danger)" />}
                      </div>
                    </div>
                    {task.status === 'uploading' && (
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${task.progress}%` }} />
                      </div>
                    )}
                    {task.status === 'error' && (
                      <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{task.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
