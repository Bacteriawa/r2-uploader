'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, UploadCloud, RefreshCw, Folder, Moon, Sun } from 'lucide-react';
import ConfigModal from '@/components/ConfigModal';
import UploadModal from '@/components/UploadModal';
import PreviewModal from '@/components/PreviewModal';
import FileList, { R2File } from '@/components/FileList';
import { R2Config, hasConfig, loadConfig } from '@/lib/config';
import { listFiles, checkAuth } from '@/lib/api';
import { useTranslation } from '@/components/LanguageProvider';

export default function Home() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [config, setConfig] = useState<R2Config | null>(null);
  const [files, setFiles] = useState<R2File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const { t, lang, setLang, theme, setTheme } = useTranslation();

  useEffect(() => {
    setIsClient(true);
    if (hasConfig()) {
      const loaded = loadConfig();
      if (loaded) {
        setConfig(loaded);
      } else {
        setIsConfigOpen(true);
        setLoading(false);
      }
    } else {
      setIsConfigOpen(true);
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async (cfg: R2Config) => {
    try {
      setLoading(true);
      setError(null);
      // Verify auth first
      await checkAuth(cfg);
      // Then load files
      const data = await listFiles(cfg);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to connect to R2');
      if (err?.response?.status === 401) {
        setIsConfigOpen(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config) {
      loadData(config);
    }
  }, [config, loadData]);

  if (!isClient) return null;

  return (
    <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>{t('appTitle')}</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0' }}>
              {config ? `${t('connectedTo')} ${config.bucket}` : t('notConnected')}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-outline"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            style={{ padding: '10px' }}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
          >
            {lang === 'en' ? '中文' : 'EN'}
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => setIsConfigOpen(true)}
          >
            <Settings size={18} /> {t('settings')}
          </button>
          
          {config && (
            <>
              <button 
                className="btn btn-outline"
                onClick={() => loadData(config)}
                disabled={loading}
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> 
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => setIsUploadOpen(true)}
              >
                <UploadCloud size={18} /> {t('upload')}
              </button>
            </>
          )}
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '24px', minHeight: '400px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <RefreshCw size={32} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--danger)' }}>
            <p>{error}</p>
            <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => setIsConfigOpen(true)}>
              {t('checkConfig')}
            </button>
          </div>
        ) : config ? (
          <FileList files={files} config={config} onRefresh={() => loadData(config)} onPreview={(key) => setPreviewKey(key)} />
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Settings size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>{t('pleaseConfigure')}</p>
          </div>
        )}
      </div>

      <ConfigModal 
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSave={(newConfig) => {
          setConfig(newConfig);
          setIsConfigOpen(false);
        }}
      />

      {config && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          config={config}
          onSuccess={() => loadData(config)}
        />
      )}

      <PreviewModal
        fileKey={previewKey}
        config={config}
        onClose={() => setPreviewKey(null)}
      />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </main>
  );
}
