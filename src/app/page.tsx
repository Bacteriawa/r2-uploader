'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, UploadCloud, RefreshCw, Folder, Moon, Sun, Database, AlertCircle, BarChart2 } from 'lucide-react';
import ConfigModal from '@/components/ConfigModal';
import UploadModal from '@/components/UploadModal';
import PreviewModal from '@/components/PreviewModal';
import FileList, { R2File } from '@/components/FileList';
import { R2Config, hasConfig, loadConfig } from '@/lib/config';
import { listFiles, checkAuth } from '@/lib/api';
import { useTranslation } from '@/components/LanguageProvider';
import StatsView from '@/components/StatsView';

const GithubIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.24c3-.3 6-1.5 6-6.76a5.5 5.5 0 0 0-1.5-3.8 5.5 5.5 0 0 0-.15-3.8s-1.2-.4-3.9 1.4a13.3 13.3 0 0 0-7 0c-2.7-1.8-3.9-1.4-3.9-1.4a5.5 5.5 0 0 0-.15 3.8 5.5 5.5 0 0 0-1.5 3.8c0 5.2 3 6.4 6 6.76a4.8 4.8 0 0 0-1 3.24v4"></path>
    <path d="M9 18c-4.51 2-5-2-7-2"></path>
  </svg>
);

export default function Home() {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [config, setConfig] = useState<R2Config | null>(null);
  const [files, setFiles] = useState<R2File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'files' | 'stats'>('files');
  const [isClient, setIsClient] = useState(false);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const { t, lang, setLang, theme, setTheme } = useTranslation();

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    setIsClient(true);
    if (hasConfig()) {
      const loaded = loadConfig();
      if (loaded) {
        setConfig(loaded);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = useCallback(async (cfg: R2Config) => {
    try {
      setLoading(true);
      setError(null);
      // Verify auth first and measure latency
      const start = Date.now();
      await checkAuth(cfg);
      setLatency(Date.now() - start);
      // Then load files
      const data = await listFiles(cfg);
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || err.message || 'Failed to connect to Object Storage');
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {config ? (
                loading ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>{t('connecting')}</span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle size={14} color="var(--danger)" />
                    <span style={{ color: 'var(--danger)' }}>{t('connectionFailed')}</span>
                  </>
                ) : (
                  <>
                    <Database size={14} color="var(--success)" />
                    <span>{t('connectedTo')}</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{config.bucket}</span> 
                    {latency ? <span style={{ opacity: 0.7, fontSize: '12px' }}>({latency}ms)</span> : ''}
                  </>
                )
              ) : (
                <>
                  <Database size={14} style={{ opacity: 0.5 }} />
                  {t('notConnected')}
                </>
              )}
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
                onClick={() => setCurrentView(currentView === 'stats' ? 'files' : 'stats')}
              >
                <BarChart2 size={18} /> {currentView === 'stats' ? t('back') || 'Back' : t('dashboard') || 'Dashboard'}
              </button>
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
          currentView === 'stats' ? (
            <StatsView files={files} onBack={() => setCurrentView('files')} />
          ) : (
            <FileList files={files} config={config} onRefresh={() => loadData(config)} onPreview={(key) => setPreviewKey(key)} />
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <Settings size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <p>{t('pleaseConfigure')}</p>
          </div>
        )}
      </div>

      <footer style={{ marginTop: '40px', paddingBottom: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <a 
          href="https://github.com/Bacteriawa/cloud-storage-uploader" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-secondary)', 
            textDecoration: 'none',
            fontSize: '13px',
            opacity: 0.7,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <GithubIcon size={16} /> {t('openSource') || 'Open Source on GitHub'}
        </a>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', opacity: 0.5, fontFamily: 'monospace' }}>
          Build: {process.env.NODE_ENV === 'development' ? 'dev' : (process.env.NEXT_PUBLIC_COMMIT_HASH || 'unknown')}
        </div>
      </footer>

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
          onOpen={() => setIsUploadOpen(true)}
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
