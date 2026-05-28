import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2, Download } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { getDownloadUrl, deleteFile } from '@/lib/api';
import { useTranslation } from './LanguageProvider';
import { useToast } from './Toast';

interface Props {
  fileKey: string | null;
  config: R2Config | null;
  onClose: () => void;
}

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp', 'avif', 'apng', 'tiff', 'tif'];
const VIDEO_EXTS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'm4v'];
const AUDIO_EXTS = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac', 'wma', 'opus'];
const TEXT_EXTS = [
  'txt', 'md', 'markdown', 'log', 'csv', 'tsv',
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'conf', 'env',
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'sass',
  'html', 'htm', 'vue', 'svelte', 'astro',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'c', 'cpp', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'cmd', 'ps1',
  'sql', 'graphql', 'gql',
  'dockerfile', 'makefile', 'gitignore', 'editorconfig',
  'lua', 'r', 'swift', 'dart', 'php', 'pl', 'ex', 'exs', 'erl', 'hs',
];
const OFFICE_EXTS = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
const FONT_EXTS = ['ttf', 'otf', 'woff', 'woff2'];

function getFileType(ext: string) {
  if (IMAGE_EXTS.includes(ext)) return 'image';
  if (VIDEO_EXTS.includes(ext)) return 'video';
  if (AUDIO_EXTS.includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (TEXT_EXTS.includes(ext)) return 'text';
  if (OFFICE_EXTS.includes(ext)) return 'office';
  if (FONT_EXTS.includes(ext)) return 'font';
  return 'unknown';
}

export default function PreviewModal({ fileKey, config, onClose }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);

  const handleCopyLink = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      showToast(t('copied'), 'success');
    }
  };

  useEffect(() => {
    if (fileKey && config) {
      setTextContent(null);
      const fetchUrl = async () => {
        try {
          setLoading(true);
          setError(null);
          const downloadUrl = await getDownloadUrl(config, fileKey);
          setUrl(downloadUrl);

          // For text files, also fetch the content
          const ext = fileKey.split('.').pop()?.toLowerCase() || '';
          if (getFileType(ext) === 'text') {
            try {
              const res = await fetch(downloadUrl);
              const text = await res.text();
              // Cap at 500KB to avoid freezing the browser
              setTextContent(text.length > 512000 ? text.slice(0, 512000) + '\n\n... (truncated)' : text);
            } catch {
              // If fetch fails (CORS), fall back to download link
            }
          }
        } catch (err: any) {
          setError(err.message || t('failedDownload'));
          showToast(err.message || t('failedDownload'), 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchUrl();
    } else {
      setUrl(null);
      setTextContent(null);
    }
  }, [fileKey, config, t]);

  if (!fileKey) return null;

  const ext = fileKey.split('.').pop()?.toLowerCase() || '';
  const fileType = getFileType(ext);

  const renderPreview = () => {
    if (!url) return null;

    switch (fileType) {
      case 'image':
        return <img src={url} alt={fileKey} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />;
      case 'video':
        return <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '70vh' }} />;
      case 'audio':
        return <audio src={url} controls style={{ width: '100%', minWidth: '300px' }} />;
      case 'pdf':
        return <iframe src={url} style={{ width: '100vw', maxWidth: '1000px', height: '70vh', border: 'none' }} />;
      case 'text':
        if (textContent !== null) {
          return (
            <pre style={{
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '70vh',
              overflow: 'auto',
              padding: '20px',
              margin: 0,
              fontSize: '13px',
              lineHeight: '1.6',
              fontFamily: '"Fira Code", "Cascadia Code", "JetBrains Mono", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: 'var(--text-primary)',
              background: 'transparent',
              textAlign: 'left',
            }}>
              {textContent}
            </pre>
          );
        }
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>{t('corsError') || 'Cannot fetch text content (CORS restriction).'}</p>
            <a href={url} target="_blank" rel="noreferrer" className="btn btn-primary">
              <ExternalLink size={16} style={{ marginRight: '8px' }} /> {t('openInBrowser') || 'Open in Browser'}
            </a>
          </div>
        );
      case 'office':
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
            style={{ width: '100vw', maxWidth: '1000px', height: '70vh', border: 'none' }}
          />
        );
      case 'font':
        return (
          <div style={{ textAlign: 'center', padding: '40px', width: '100%', maxWidth: '600px' }}>
            <style>{`@font-face { font-family: 'PreviewFont'; src: url('${url}'); }`}</style>
            <p style={{ fontFamily: 'PreviewFont', fontSize: '48px', marginBottom: '24px' }}>
              AaBbCcDd
            </p>
            <p style={{ fontFamily: 'PreviewFont', fontSize: '24px', marginBottom: '16px' }}>
              The quick brown fox jumps over the lazy dog.
            </p>
            <p style={{ fontFamily: 'PreviewFont', fontSize: '24px', marginBottom: '16px' }}>
              汉字测试 0123456789 !@#$%
            </p>
            <p style={{ fontFamily: 'PreviewFont', fontSize: '16px', color: 'var(--text-secondary)' }}>
              ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
            </p>
          </div>
        );
      default:
        return (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              {t('previewNotAvailable') || 'Preview not available for'} <strong>.{ext}</strong> {t('previewNotAvailableEnd') || 'files.'}
            </p>
            <a href={url} download={fileKey} className="btn btn-primary">
              <Download size={16} style={{ marginRight: '8px' }} /> {t('downloadFile') || 'Download File'}
            </a>
          </div>
        );
    }
  };

  return (
    <AnimatePresence>
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
          style={{ maxWidth: '90vw', width: 'auto', maxHeight: '90vh', padding: '16px', display: 'flex', flexDirection: 'column' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
              {fileKey}
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {url && (
                <a href={url} target="_blank" rel="noreferrer" className="action-icon" style={{ textDecoration: 'none', background: 'transparent' }} title={t('openInNewTab') || 'Open in new tab'}>
                  <ExternalLink size={20} />
                </a>
              )}
              <button onClick={onClose} className="action-icon" style={{ border: 'none', background: 'transparent' }}>
                <X size={24} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <Loader2 size={32} className="animate-spin" color="var(--accent)" />
            ) : error ? (
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            ) : renderPreview()}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
