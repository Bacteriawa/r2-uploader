'use client';

import { useState, useMemo } from 'react';
import { File as FileIcon, Trash2, Edit2, Download, Link as LinkIcon, Check, Eye, Search } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { deleteFile, renameFile, getDownloadUrl } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from './LanguageProvider';
import { useToast } from './Toast';

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
  const { showToast } = useToast();
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    const lowerQuery = searchQuery.toLowerCase();
    return files.filter(f => f.key.toLowerCase().includes(lowerQuery));
  }, [files, searchQuery]);

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
      showToast(t('deleteSuccess') || 'File deleted successfully', 'success');
    } catch (e: any) {
      showToast(e.message || t('failedDelete'), 'error');
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
      showToast(t('renameSuccess') || 'File renamed successfully', 'success');
    } catch (e: any) {
      showToast(e.message || t('failedRename'), 'error');
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
    } catch (e: any) {
      showToast(e.message || t('failedDownload'), 'error');
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
      showToast(t('copied'), 'success');
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (e) {
      showToast(t('copyError') || 'Failed to copy to clipboard', 'error');
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {files.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '40px', paddingRight: '16px', borderRadius: '12px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}
              placeholder={t('searchFiles') || 'Search files...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {filteredFiles.length} {t('filesCount') || 'files'}
          </div>
        </div>
      )}
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
            {filteredFiles.map(file => (
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
                        title={t('preview') || 'Click to preview'}
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
                      title={t('download') || 'Download'}
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
                      title={t('rename') || 'Rename'}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-outline action-icon delete"
                      style={{ border: 'none' }}
                      onClick={() => handleDelete(file.key)}
                      title={t('delete') || 'Delete'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
            {filteredFiles.length === 0 && searchQuery && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                  {t('noSearchResults') || 'No files match your search.'}
                </td>
              </tr>
            )}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  </div>
  );
}
