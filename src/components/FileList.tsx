'use client';

import { useState } from 'react';
import { File as FileIcon, Trash2, Edit2, Download, Link as LinkIcon, Check, Eye } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { deleteFile, renameFile, getDownloadUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from './LanguageProvider';

export interface R2File {
  key: string;
  size: number;
  lastModified: string;
}

interface Props {
  files: R2File[];
  config: R2Config;
  onRefresh: () => void;
  onPreview: (key: string) => void;
}

export default function FileList({ files, config, onRefresh, onPreview }: Props) {
  const { t } = useTranslation();
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const handleDelete = async (key: string) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      setLoading(key);
      await deleteFile(config, key);
      onRefresh();
    } catch (e) {
      alert(t('failedDelete'));
    } finally {
      setLoading(null);
    }
  };

  const handleRename = async (oldKey: string) => {
    if (!newKey || newKey === oldKey) {
      setRenamingKey(null);
      return;
    }
    try {
      setLoading(oldKey);
      await renameFile(config, oldKey, newKey);
      setRenamingKey(null);
      onRefresh();
    } catch (e) {
      alert(t('failedRename'));
    } finally {
      setLoading(null);
    }
  };

  const handleDownload = async (key: string) => {
    try {
      setLoading(key);
      const url = await getDownloadUrl(config, key);
      const a = document.createElement('a');
      a.href = url;
      a.download = key;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert(t('failedDownload'));
    } finally {
      setLoading(null);
    }
  };

  const handleCopyLink = async (key: string) => {
    if (!config.publicDomain) return;
    
    // ensure domain ends without slash
    const domain = config.publicDomain.endsWith('/') 
      ? config.publicDomain.slice(0, -1) 
      : config.publicDomain;
      
    // ensure domain starts with http
    const fullDomain = domain.startsWith('http') ? domain : `https://${domain}`;
    
    const url = `${fullDomain}/${encodeURIComponent(key)}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  };

  if (files.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
        <FileIcon size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
        <p>{t('noFiles')}</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>{t('name')}</th>
            <th>{t('size')}</th>
            <th>{t('lastModified')}</th>
            <th style={{ textAlign: 'right' }}>{t('actions')}</th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {files.map(file => (
              <motion.tr 
                key={file.key}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileIcon size={18} color="var(--accent)" />
                    {renamingKey === file.key ? (
                      <input
                        autoFocus
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                        onBlur={() => handleRename(file.key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(file.key);
                          if (e.key === 'Escape') setRenamingKey(null);
                        }}
                        className="input-field"
                        style={{ padding: '6px 10px', width: '200px' }}
                      />
                    ) : (
                      <span 
                        onClick={() => onPreview(file.key)}
                        style={{ cursor: 'pointer' }}
                        className="filename-link"
                        title="Click to preview"
                      >
                        {file.key}
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatSize(file.size)}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{formatDate(file.lastModified)}</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', opacity: loading === file.key ? 0.5 : 1, pointerEvents: loading === file.key ? 'none' : 'auto' }}>
                    {config.publicDomain && (
                      <button 
                        className="btn-outline action-icon"
                        style={{ border: 'none' }}
                        onClick={() => handleCopyLink(file.key)}
                        title={copiedKey === file.key ? t('copied') : t('copyLink')}
                      >
                        {copiedKey === file.key ? <Check size={16} color="var(--success)" /> : <LinkIcon size={16} />}
                      </button>
                    )}
                    <button 
                      className="btn-outline action-icon"
                      style={{ border: 'none' }}
                      onClick={() => handleDownload(file.key)}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      className="btn-outline action-icon"
                      style={{ border: 'none' }}
                      onClick={() => {
                        setRenamingKey(file.key);
                        setNewKey(file.key);
                      }}
                      title="Rename"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-outline action-icon delete"
                      style={{ border: 'none' }}
                      onClick={() => handleDelete(file.key)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  );
}
