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

const STORAGE_KEY = 'r2_uploader_config';
const STORAGE_LIST_KEY = 'r2_uploader_configs_list';

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
    return JSON.parse(jsonStr) as R2Config[];
  } catch (e) {
    return [];
  }
}

export function saveAllConfigs(configs: R2Config[]) {
  localStorage.setItem(STORAGE_LIST_KEY, JSON.stringify(configs));
}

export function saveConfig(config: R2Config) {
  if (!config.id) {
    config.id = Math.random().toString(36).substr(2, 9);
  }
  if (!config.label) {
    config.label = config.bucket || 'New Profile';
  }
  
  const jsonStr = JSON.stringify(config);
  localStorage.setItem(STORAGE_KEY, jsonStr);
  if (config.sitePassword) {
    localStorage.setItem('r2_site_password', config.sitePassword);
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

export function loadConfig(): R2Config | null {
  if (typeof window === 'undefined') return null;
  const jsonStr = localStorage.getItem(STORAGE_KEY);
  if (!jsonStr) return null;

  try {
    return JSON.parse(jsonStr) as R2Config;
  } catch (e) {
    return null;
  }
}

export function getSitePassword(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('r2_site_password') || '';
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
  localStorage.removeItem('r2_site_password');
}
