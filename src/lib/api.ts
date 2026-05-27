import { R2Config } from './config';
import axios from 'axios';

function getHeaders(config: R2Config) {
  return {
    'X-R2-Access-Key': config.accessKeyId,
    'X-R2-Secret-Key': config.secretAccessKey,
    'X-R2-Bucket': config.bucket,
    'X-R2-Endpoint': config.endpoint,
  };
}

export async function checkAuth(config: R2Config) {
  const res = await axios.get('/api/auth', { headers: getHeaders(config) });
  return res.data;
}

export async function listFiles(config: R2Config, prefix: string = '') {
  const res = await axios.get(`/api/files?prefix=${encodeURIComponent(prefix)}`, { headers: getHeaders(config) });
  return res.data.files;
}

export async function deleteFile(config: R2Config, key: string) {
  const res = await axios.delete(`/api/files/${encodeURIComponent(key)}`, { headers: getHeaders(config) });
  return res.data;
}

export async function renameFile(config: R2Config, oldKey: string, newKey: string) {
  const res = await axios.post(`/api/files/${encodeURIComponent(oldKey)}`, { action: 'rename', newKey }, { headers: getHeaders(config) });
  return res.data;
}

export async function getDownloadUrl(config: R2Config, key: string) {
  const res = await axios.post(`/api/files/${encodeURIComponent(key)}`, { action: 'download' }, { headers: getHeaders(config) });
  return res.data.url;
}

export async function getPresignedUrl(config: R2Config, key: string, contentType: string) {
  const res = await axios.post('/api/upload/presign', { key, contentType }, { headers: getHeaders(config) });
  return res.data.url;
}

export async function initMultipartUpload(config: R2Config, key: string, contentType: string) {
  const res = await axios.post('/api/upload/multipart/init', { key, contentType }, { headers: getHeaders(config) });
  return res.data.uploadId;
}

export async function getMultipartPresignedUrl(config: R2Config, key: string, uploadId: string, partNumber: number) {
  const res = await axios.post('/api/upload/multipart/presign', { key, uploadId, partNumber }, { headers: getHeaders(config) });
  return res.data.url;
}

export async function completeMultipartUpload(config: R2Config, key: string, uploadId: string, parts: { partNumber: number, eTag: string }[]) {
  const res = await axios.post('/api/upload/multipart/complete', { key, uploadId, parts }, { headers: getHeaders(config) });
  return res.data;
}
