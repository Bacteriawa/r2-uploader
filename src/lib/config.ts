export interface R2Config {
  id?: string;
  label?: string;
  provider?: 'r2' | 's3' | 'oss' | 'cos' | 'custom';
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
  region?: string;
  publicDomain?: string;
  sitePassword?: string;
}

import CryptoJS from 'crypto-js';

const OBFUSCATION_KEY = 'r2-client-side-obfuscation-key-2026';

function encryptSecret(text: string): string {
  if (!text) return text;
  // Don't re-encrypt if it already looks like crypto-js AES output (starts with U2FsdGVkX1)
  if (text.startsWith('U2FsdGVkX1')) return text;
  return CryptoJS.AES.encrypt(text, OBFUSCATION_KEY).toString();
}

function decryptSecret(cipherText: string): string {
  if (!cipherText) return cipherText;
  if (!cipherText.startsWith('U2FsdGVkX1')) return cipherText; // Plaintext legacy
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, OBFUSCATION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || cipherText;
  } catch {
    return cipherText;
  }
}

function encryptConfig(config: R2Config): R2Config {
  return {
    ...config,
    accessKeyId: encryptSecret(config.accessKeyId),
    secretAccessKey: encryptSecret(config.secretAccessKey)
  };
}

function decryptConfig(config: R2Config): R2Config {
  return {
    ...config,
    accessKeyId: decryptSecret(config.accessKeyId),
    secretAccessKey: decryptSecret(config.secretAccessKey)
  };
}

const STORAGE_KEY = 'cloud_storage_uploader_config';
const STORAGE_LIST_KEY = 'cloud_storage_uploader_configs_list';

export function loadAllConfigs(): R2Config[] {
  if (typeof window === 'undefined') return [];
  const jsonStr = localStorage.getItem(STORAGE_LIST_KEY);
  if (!jsonStr) {
    const single = loadConfig();
    if (single) {
      single.id = 'default';
      single.label = 'Default Profile';
      return [single];
    }
    return [];
  }
  try {
    const parsed = JSON.parse(jsonStr) as R2Config[];
    return parsed.map(decryptConfig);
  } catch {
    return [];
  }
}

export function saveAllConfigs(configs: R2Config[]) {
  const encrypted = configs.map(encryptConfig);
  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(encrypted));
}

export function saveConfig(config: R2Config) {
  if (!config.id) {
    config.id = Math.random().toString(36).substr(2, 9);
  }
  if (!config.label) {
    config.label = config.bucket || 'New Profile';
  }
  
  const encrypted = encryptConfig(config);
  const jsonStr = JSON.stringify(encrypted);
  localStorage.setItem(STORAGE_KEY, jsonStr);
  if (config.sitePassword) {
    localStorage.setItem('cloud_storage_site_password', config.sitePassword);
  }

  const all = loadAllConfigs();
  const existingIndex = all.findIndex(c => c.id === config.id);
  if (existingIndex >= 0) {
    all[existingIndex] = config;
  } else {
    all.push(config);
  }
  saveAllConfigs(all);
}

export function deleteConfig(id: string) {
  const all = loadAllConfigs();
  const filtered = all.filter(c => c.id !== id);
  saveAllConfigs(filtered);

  const current = loadConfig();
  if (current && current.id === id) {
    if (filtered.length > 0) {
      saveConfig(filtered[0]);
    } else {
      clearConfig();
    }
  }
}

export function loadConfig(): R2Config | null {
  if (typeof window === 'undefined') return null;
  const jsonStr = localStorage.getItem(STORAGE_KEY);
  if (!jsonStr) return null;

  try {
    const parsed = JSON.parse(jsonStr) as R2Config;
    return decryptConfig(parsed);
  } catch {
    return null;
  }
}

export function getSitePassword(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('cloud_storage_site_password') || '';
  }
  return '';
}

export function hasConfig(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem(STORAGE_KEY);
  }
  return false;
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('cloud_storage_site_password');
}
