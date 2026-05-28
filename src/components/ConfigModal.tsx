'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Lock, Cloud, Key, Shield, X, Server, ChevronDown, List, Plus } from 'lucide-react';
import { R2Config, saveConfig, loadConfig, loadAllConfigs } from '@/lib/config';
import { useTranslation } from './LanguageProvider';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: R2Config) => void;
}

export default function ConfigModal({ isOpen, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [config, setConfig] = useState<Partial<R2Config>>({
    accessKeyId: '',
    secretAccessKey: '',
    bucket: '',
    endpoint: '',
    region: 'auto',
    publicDomain: '',
    provider: 'r2',
  });
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const providerOptions = [
    { id: 'r2', name: 'Cloudflare R2' },
    { id: 's3', name: 'AWS S3' },
    { id: 'oss', name: 'Aliyun OSS (阿里云)' },
    { id: 'cos', name: 'Tencent COS (腾讯云)' },
    { id: 'custom', name: 'Custom S3 / MinIO' }
  ];

  const [profiles, setProfiles] = useState<R2Config[]>([]);

  useEffect(() => {
    if (isOpen) {
      const existing = loadConfig();
      if (existing) {
        setConfig(existing);
      } else {
        setConfig({ accessKeyId: '', secretAccessKey: '', bucket: '', endpoint: '', region: 'auto', publicDomain: '', provider: 'r2', label: 'New Profile' });
      }
      setProfiles(loadAllConfigs());
    }
  }, [isOpen]);

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!config.accessKeyId || !config.secretAccessKey || !config.bucket || !config.endpoint) return;
    
    const finalConfig = {
      ...config
    } as R2Config;
    
    saveConfig(finalConfig);
    onSave(finalConfig);
    onClose();
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
            style={{ maxWidth: '800px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ padding: '10px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
                  <Settings size={24} />
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 600 }}>
                  {t('storageSettings')}
                </h2>
              </div>
              <button type="button" onClick={onClose} className="action-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleConfigSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'grid', gap: '24px 32px', gridTemplateColumns: '1fr 1fr' }}>
                <div style={{ gridColumn: 'span 1', position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <List size={14} /> {t('savedProfiles') || 'Saved Profiles'}
                  </label>
                  <div 
                    className="input-field"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                  >
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {(!config.id || config.id === 'new') 
                        ? <><Plus size={14} /> {t('newProfile') || 'Create New Profile'}</>
                        : (config.label || config.bucket)}
                    </span>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </div>
                  
                  <AnimatePresence>
                    {isProfileOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsProfileOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            right: 0,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            zIndex: 50,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '4px',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                        >
                          <div
                            onClick={() => {
                              setConfig({ accessKeyId: '', secretAccessKey: '', bucket: '', endpoint: '', region: 'auto', publicDomain: '', provider: 'r2', label: 'New Profile' });
                              setIsProfileOpen(false);
                            }}
                            style={{
                              padding: '8px 12px',
                              fontSize: '13px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              background: (!config.id || config.id === 'new') ? 'var(--input-bg)' : 'transparent',
                              color: (!config.id || config.id === 'new') ? 'var(--accent)' : 'var(--text-primary)',
                              fontWeight: (!config.id || config.id === 'new') ? 600 : 400,
                              transition: 'background-color 0.1s',
                              marginBottom: '4px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = (!config.id || config.id === 'new') ? 'var(--input-bg)' : 'transparent'}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Plus size={14} /> {t('newProfile') || 'Create New Profile'}
                            </div>
                          </div>
                          
                          {profiles.length > 0 && (
                            <div style={{ padding: '4px 12px', fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              {t('existingProfiles') || 'Existing Profiles'}
                            </div>
                          )}
                          
                          {profiles.map(p => (
                            <div
                              key={p.id}
                              onClick={() => {
                                setConfig(p);
                                setIsProfileOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: config.id === p.id ? 'var(--input-bg)' : 'transparent',
                                color: config.id === p.id ? 'var(--accent)' : 'var(--text-primary)',
                                fontWeight: config.id === p.id ? 600 : 400,
                                transition: 'background-color 0.1s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = config.id === p.id ? 'var(--input-bg)' : 'transparent'}
                            >
                              {p.label || p.bucket}
                            </div>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                
                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {t('profileName') || 'Profile Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={config.label || ''}
                    onChange={e => setConfig(prev => ({ ...prev, label: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. Work OSS"
                  />
                </div>

                <div style={{ gridColumn: 'span 1', position: 'relative' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Server size={14} /> {t('storageProvider') || 'Storage Provider'}
                  </label>
                  <div 
                    className="input-field"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
                    onClick={() => setIsProviderOpen(!isProviderOpen)}
                  >
                    <span>{providerOptions.find(p => p.id === (config.provider || 'r2'))?.name}</span>
                    <ChevronDown size={16} style={{ color: 'var(--text-secondary)', transform: isProviderOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                  </div>
                  
                  <AnimatePresence>
                    {isProviderOpen && (
                      <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setIsProviderOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: 0,
                            right: 0,
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                            zIndex: 50,
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '4px'
                          }}
                        >
                          {providerOptions.map(option => (
                            <div
                              key={option.id}
                              onClick={() => {
                                const provider = option.id as any;
                                setConfig(prev => {
                                  let newEndpoint = prev.endpoint || '';
                                  let newRegion = prev.region || '';
                                  if (provider === 'r2') { newEndpoint = 'https://<account_id>.r2.cloudflarestorage.com'; newRegion = 'auto'; }
                                  else if (provider === 's3') { newEndpoint = 'https://s3.us-east-1.amazonaws.com'; newRegion = 'us-east-1'; }
                                  else if (provider === 'oss') { newEndpoint = 'https://oss-cn-hangzhou.aliyuncs.com'; newRegion = 'cn-hangzhou'; }
                                  else if (provider === 'cos') { newEndpoint = 'https://cos.ap-guangzhou.myqcloud.com'; newRegion = 'ap-guangzhou'; }
                                  else if (provider === 'custom') { newEndpoint = 'https://play.min.io'; newRegion = 'us-east-1'; }
                                  return { ...prev, provider, endpoint: newEndpoint, region: newRegion };
                                });
                                setIsProviderOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '13px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                background: config.provider === option.id ? 'var(--input-bg)' : 'transparent',
                                color: config.provider === option.id ? 'var(--accent)' : 'var(--text-primary)',
                                fontWeight: config.provider === option.id ? 600 : 400,
                                transition: 'background-color 0.1s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--input-bg)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = config.provider === option.id ? 'var(--input-bg)' : 'transparent'}
                            >
                              {option.name}
                            </div>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Cloud size={14} /> {t('region')}
                  </label>
                  <input
                    type="text"
                    value={config.region}
                    onChange={e => setConfig(prev => ({ ...prev, region: e.target.value }))}
                    className="input-field"
                    placeholder="auto (or ap-guangzhou)"
                  />
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Key size={14} /> {t('accessKeyId')}
                  </label>
                  <input
                    type="text"
                    required
                    value={config.accessKeyId}
                    onChange={e => setConfig(prev => ({ ...prev, accessKeyId: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. 1234567890abcdef"
                  />
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Shield size={14} /> {t('secretAccessKey')}
                  </label>
                  <input
                    type="password"
                    required
                    value={config.secretAccessKey}
                    onChange={e => setConfig(prev => ({ ...prev, secretAccessKey: e.target.value }))}
                    className="input-field"
                    placeholder="Enter secret key..."
                  />
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Cloud size={14} /> {t('bucketName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={config.bucket}
                    onChange={e => setConfig(prev => ({ ...prev, bucket: e.target.value }))}
                    className="input-field"
                    placeholder="my-bucket"
                  />
                </div>

                <div style={{ gridColumn: 'span 1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Cloud size={14} /> {t('endpoint')}
                  </label>
                  <input
                    type="text"
                    required
                    value={config.endpoint}
                    onChange={e => setConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    <Cloud size={14} /> {t('publicDomain')}
                  </label>
                  <input
                    type="text"
                    value={config.publicDomain || ''}
                    onChange={e => setConfig(prev => ({ ...prev, publicDomain: e.target.value }))}
                    className="input-field"
                    placeholder="https://pub-xxx.r2.dev (Optional)"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '12px', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  {t('saveConfig')}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
