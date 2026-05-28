'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloud, X, File as FileIcon, CheckCircle, AlertCircle, Pause, Play, Loader2 } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { getPresignedUrl, initMultipartUpload, getMultipartPresignedUrl, completeMultipartUpload } from '@/lib/api';
import axios from 'axios';
import { useTranslation } from './LanguageProvider';
import { useToast } from './Toast';

interface Props {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  config: R2Config;
  onSuccess: () => void;
}

interface GhostFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  isGhost: true;
}

interface UploadTask {
  id: string;
  file: File | GhostFile;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'success' | 'error' | 'ghost';
  error?: string;
  loadedSize?: number;
  speed?: number;
  abortController?: AbortController;
  uploadId?: string;
  parts?: { partNumber: number, eTag: string }[];
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const getFileId = (file: File | GhostFile) => `${file.name}_${file.size}_${file.lastModified}`;

export default function UploadModal({ isOpen, onOpen, onClose, config, onSuccess }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<UploadTask[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`r2_tasks_${config.bucket}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.filter((t: any) => t.status !== 'success').map((t: any) => ({
            ...t,
            status: 'ghost',
            speed: 0,
            abortController: undefined,
            file: { ...t.file, isGhost: true }
          }));
        } catch(e) {}
      }
    }
    return [];
  });
  const [isDragActive, setIsDragActive] = useState(false);
  const [showDropzone, setShowDropzone] = useState(true);

  // Clean up aborted requests when modal unmounts
  useEffect(() => {
    return () => {
      tasks.forEach(task => {
        if (task.status === 'uploading' && task.abortController) {
          task.abortController.abort();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setShowDropzone(true), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    const serializable = tasks.map(t => ({
      id: t.id,
      file: { name: t.file.name, size: t.file.size, type: t.file.type, lastModified: t.file.lastModified },
      progress: t.progress,
      status: t.status,
      loadedSize: t.loadedSize,
      uploadId: t.uploadId,
      parts: t.parts
    }));
    localStorage.setItem(`r2_tasks_${config.bucket}`, JSON.stringify(serializable));
  }, [tasks, config.bucket]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const processUpload = async (taskId: string, file: File, existingUploadId?: string, existingParts?: { partNumber: number, eTag: string }[]) => {
    const abortController = new AbortController();
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'uploading', abortController, error: undefined } : t));

    try {
      const key = file.name;
      const contentType = file.type || 'application/octet-stream';
      const startTime = Date.now();

      if (file.size === 0) {
        showToast(t('emptyFileError') || 'Folders or 0-byte files are not supported', 'error');
        throw new Error(t('emptyFileError') || 'Folders or 0-byte files are not supported');
      }

      if (file.size <= CHUNK_SIZE) {
        // Simple upload (Not resumable)
        const url = await getPresignedUrl(config, key, contentType);
        await axios.put(url, file, {
          headers: { 'Content-Type': contentType },
          signal: abortController.signal,
          onUploadProgress: (progressEvent) => {
            const loaded = progressEvent.loaded;
            const percentCompleted = file.size === 0 ? 100 : Math.round((loaded * 100) / (progressEvent.total || file.size));
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? loaded / elapsed : 0;
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: percentCompleted, loadedSize: loaded, speed } : t));
          }
        });
      } else {
        // Multipart upload - Resumable!
        let uploadId = existingUploadId;
        const parts = existingParts ? [...existingParts] : [];
        const cacheKey = `r2_upload_${config.bucket}_${getFileId(file)}`;

        if (!uploadId) {
          uploadId = await initMultipartUpload(config, key, contentType);
          localStorage.setItem(cacheKey, JSON.stringify({ uploadId, parts: [] }));
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, uploadId } : t));
        }

        if (!uploadId) throw new Error('Upload ID is missing');

        const totalParts = Math.ceil(file.size / CHUNK_SIZE);
        
        let loadedTotal = parts.length * CHUNK_SIZE;

        for (let i = 0; i < totalParts; i++) {
          const partNumber = i + 1;
          
          if (parts.find(p => p.partNumber === partNumber)) {
             continue; // Skip already uploaded part
          }

          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const url = await getMultipartPresignedUrl(config, key, uploadId, partNumber);
          
          const res = await axios.put(url, chunk, {
            headers: { 'Content-Type': contentType },
            signal: abortController.signal,
            onUploadProgress: (progressEvent) => {
              const currentLoadedTotal = loadedTotal + progressEvent.loaded;
              const percentCompleted = Math.round((currentLoadedTotal * 100) / file.size);
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = elapsed > 0 ? progressEvent.loaded / elapsed : 0; // Current chunk speed
              setTasks(prev => prev.map(t => t.id === taskId ? { ...t, progress: percentCompleted, loadedSize: currentLoadedTotal, speed } : t));
            }
          });

          const eTag = res.headers['etag'];
          parts.push({ partNumber, eTag: eTag.replace(/"/g, '') });
          loadedTotal += chunk.size;
          
          localStorage.setItem(cacheKey, JSON.stringify({ uploadId, parts }));
          setTasks(prev => prev.map(t => t.id === taskId ? { ...t, parts } : t));
        }

        await completeMultipartUpload(config, key, uploadId, parts);
        localStorage.removeItem(cacheKey);
      }

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'success', progress: 100 } : t));
      onSuccess();
    } catch (error: any) {
      if (axios.isCancel(error) || error.name === 'CanceledError' || abortController.signal.aborted) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'paused', speed: 0 } : t));
      } else {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error', error: error.message, speed: 0 } : t));
      }
    }
  };

  const handlePause = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && task.abortController) {
      task.abortController.abort();
    }
  };

  const handleResume = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && !('isGhost' in task.file)) {
      processUpload(taskId, task.file as File, task.uploadId, task.parts);
    }
  };

  const handleGhostSelect = (e: React.ChangeEvent<HTMLInputElement>, taskId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (file.name !== task.file.name || file.size !== task.file.size) {
       showToast(t('fileMismatch') || 'Please select the exact same file to resume.', 'error');
       e.target.value = '';
       return;
    }
    
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, file, status: 'paused' } : t));
    processUpload(taskId, file, task.uploadId, task.parts);
    e.target.value = '';
  };

  const handleCancel = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      if (task.abortController) {
        task.abortController.abort();
      }
      const cacheKey = `r2_upload_${config.bucket}_${getFileId(task.file)}`;
      localStorage.removeItem(cacheKey);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const addFilesToQueue = (fileList: FileList | File[]) => {
    const newTasks = Array.from(fileList).map(file => {
      const fileId = getFileId(file);
      const cacheKey = `r2_upload_${config.bucket}_${fileId}`;
      const cached = localStorage.getItem(cacheKey);
      let uploadId = undefined;
      let parts = [];
      let initialProgress = 0;
      let initialLoaded = 0;

      if (cached && file.size > CHUNK_SIZE) {
        try {
          const parsed = JSON.parse(cached);
          uploadId = parsed.uploadId;
          parts = parsed.parts || [];
          initialLoaded = parts.length * CHUNK_SIZE;
          initialProgress = Math.round((initialLoaded * 100) / file.size);
        } catch (e) {}
      }

      const id = Math.random().toString(36).substring(7);
      return {
        id,
        file,
        progress: initialProgress,
        loadedSize: initialLoaded,
        status: 'pending' as const,
        uploadId,
        parts
      };
    });
    
    setTasks(prev => [...prev, ...newTasks]);
    
    newTasks.forEach(task => {
      processUpload(task.id, task.file, task.uploadId, task.parts);
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  }, [config, onSuccess]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <>
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
            style={{ maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
                  <UploadCloud size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{t('upload')}</h2>
              </div>
              <button onClick={onClose} className="action-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {showDropzone ? (
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
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn btn-outline" onClick={() => setShowDropzone(true)}>
                    + {t('upload')}
                  </button>
                </div>
              )}

              {tasks.length > 0 && (
                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{t('uploadQueue')}</h4>
                  {tasks.map(task => (
                    <div key={task.id} style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '50%' }}>
                          <FileIcon size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {task.file.name}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {(task.status === 'uploading' || task.status === 'paused' || task.status === 'ghost') && task.loadedSize !== undefined ? (
                              <>
                                {(task.loadedSize / (1024 * 1024)).toFixed(2)} / {(task.file.size / (1024 * 1024)).toFixed(2)} MB
                                {task.status === 'uploading' && task.speed ? ` • ${(task.speed / (1024 * 1024)).toFixed(2)} MB/s` : ''}
                                {task.status === 'paused' ? t('paused') : ''}
                                {task.status === 'ghost' ? t('waitingForFile') : ''}
                              </>
                            ) : (
                              `${(task.file.size / (1024 * 1024)).toFixed(2)} MB`
                            )}
                          </span>
                          
                          {task.status === 'uploading' && task.file.size > CHUNK_SIZE && (
                            <button className="btn-outline action-icon" onClick={() => handlePause(task.id)} title={t('pause')}>
                              <Pause size={16} />
                            </button>
                          )}
                          {task.status === 'paused' && !('isGhost' in task.file) && (
                            <button className="btn-outline action-icon" onClick={() => handleResume(task.id)} title={t('resume')}>
                              <Play size={16} />
                            </button>
                          )}
                          {task.status === 'ghost' && (
                            <>
                              <input type="file" id={`ghost-${task.id}`} style={{ display: 'none' }} onChange={(e) => handleGhostSelect(e, task.id)} />
                              <button className="btn-outline action-icon" onClick={() => document.getElementById(`ghost-${task.id}`)?.click()} title={t('selectToResume')}>
                                <Play size={16} />
                              </button>
                            </>
                          )}
                          {(task.status === 'uploading' || task.status === 'paused' || task.status === 'pending' || task.status === 'error' || task.status === 'ghost') && (
                            <button className="btn-outline action-icon delete" onClick={() => handleCancel(task.id)} title={t('cancel')}>
                              <X size={16} />
                            </button>
                          )}
                          
                          {task.status === 'success' && <CheckCircle size={16} color="var(--success)" />}
                          {task.status === 'error' && <AlertCircle size={16} color="var(--danger)" />}
                        </div>
                      </div>
                      {(task.status === 'uploading' || task.status === 'paused' || task.status === 'ghost') && (
                        <div className="progress-bar-bg">
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${task.progress}%`,
                              background: task.status === 'paused' || task.status === 'ghost' ? 'var(--text-secondary)' : 'var(--accent)',
                              transition: 'width 0.3s ease, background 0.3s ease'
                            }} 
                          />
                        </div>
                      )}
                      {task.status === 'error' && (
                        <p style={{ color: 'var(--danger)', fontSize: '12px', marginTop: '4px' }}>{task.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
      
      <AnimatePresence>
        {!isOpen && tasks.some(t => t.status === 'uploading' || t.status === 'paused' || t.status === 'pending' || t.status === 'ghost') && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              zIndex: 50,
              width: '320px',
              cursor: 'pointer'
            }}
            onClick={() => {
              setShowDropzone(false);
              onOpen();
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UploadCloud size={18} color="var(--accent)" />
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {tasks.filter(t => t.status === 'uploading' || t.status === 'pending').length}{t('uploadingCount')}
                </span>
              </div>
            </div>
            
            {/* Find first active task to show progress */}
            {(() => {
              const activeTask = tasks.find(t => t.status === 'uploading' || t.status === 'paused' || t.status === 'pending' || t.status === 'ghost');
              if (!activeTask) return null;
              return (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeTask.file.name}
                  </div>
                  <div className="progress-bar-bg" style={{ height: '4px' }}>
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${activeTask.progress}%`,
                        background: activeTask.status === 'paused' || activeTask.status === 'ghost' ? 'var(--text-secondary)' : 'var(--accent)'
                      }} 
                    />
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
