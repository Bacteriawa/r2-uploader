import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Loader2 } from 'lucide-react';
import { R2Config } from '@/lib/config';
import { getDownloadUrl } from '@/lib/api';
import { useTranslation } from './LanguageProvider';

interface Props {
  fileKey: string | null;
  config: R2Config | null;
  onClose: () => void;
}

export default function PreviewModal({ fileKey, config, onClose }: Props) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fileKey && config) {
      const fetchUrl = async () => {
        try {
          setLoading(true);
          setError(null);
          // If public domain is configured, we can just use that, but presigned URL is guaranteed to work even for private buckets.
          const downloadUrl = await getDownloadUrl(config, fileKey);
          setUrl(downloadUrl);
        } catch (e) {
          setError(t('failedDownload'));
        } finally {
          setLoading(false);
        }
      };
      fetchUrl();
    } else {
      setUrl(null);
    }
  }, [fileKey, config, t]);

  if (!fileKey) return null;

  const ext = fileKey.split('.').pop()?.toLowerCase() || '';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
  const isAudio = ['mp3', 'wav', 'ogg', 'm4a'].includes(ext);
  const isPdf = ext === 'pdf';

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
                <a href={url} target="_blank" rel="noreferrer" className="btn-outline action-icon" style={{ padding: '8px', border: 'none' }} title="Open in new tab">
                  <ExternalLink size={20} />
                </a>
              )}
              <button onClick={onClose} className="btn-outline action-icon" style={{ padding: '8px', border: 'none' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', background: 'rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
            {loading ? (
              <Loader2 size={32} className="animate-spin" color="var(--accent)" />
            ) : error ? (
              <p style={{ color: 'var(--danger)' }}>{error}</p>
            ) : url ? (
              <>
                {isImage && <img src={url} alt={fileKey} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }} />}
                {isVideo && <video src={url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '70vh' }} />}
                {isAudio && <audio src={url} controls style={{ width: '100%', minWidth: '300px' }} />}
                {isPdf && <iframe src={url} style={{ width: '100vw', maxWidth: '1000px', height: '70vh', border: 'none' }} />}
                {!isImage && !isVideo && !isAudio && !isPdf && (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p style={{ marginBottom: '16px' }}>Preview not supported for this file type.</p>
                    <a href={url} download={fileKey} className="btn btn-primary">Download File</a>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
