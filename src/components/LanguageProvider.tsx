/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'en' | 'zh';
export type Theme = 'light' | 'dark';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    appTitle: 'Cloud Storage Uploader',
    connectedTo: 'Connected to',
    notConnected: 'Not connected',
    settings: 'Settings',
    upload: 'Upload',
    uploadQueue: 'Upload Queue',
    dragDrop: 'Drag & drop your files here',
    supportsLarge: 'Supports large files with automatic chunking',
    browseFiles: 'Browse Files',
    noFiles: 'No files found in this bucket.',
    name: 'Name',
    size: 'Size',
    lastModified: 'Last Modified',
    actions: 'Actions',
    pleaseConfigure: 'Please configure your Object Storage (S3/R2/OSS/COS) credentials to continue.',
    checkConfig: 'Check Configuration',
    storageSettings: 'Storage Settings',
    accessKeyId: 'Access Key ID',
    secretAccessKey: 'Secret Access Key',
    bucketName: 'Bucket Name',
    region: 'Region',
    endpoint: 'Endpoint',
    publicDomain: 'Public Domain / CDN (Optional)',
    continue: 'Continue',
    back: 'Back',
    saveConfig: 'Save Configuration',
    confirmDelete: 'Are you sure you want to delete this file?',
    confirmDeleteProfile: 'Are you sure you want to delete this profile?',
    confirmAction: 'Confirm Action',
    copyLink: 'Copy Link',
    copied: 'Copied!',
    failedDelete: 'Failed to delete file',
    failedRename: 'Failed to rename file',
    failedDownload: 'Failed to get download URL',
    emptyFileError: 'Folders or 0-byte files are not supported',
    connecting: 'Connecting...',
    connectionFailed: 'Connection failed',
    paused: ' (Paused)',
    waitingForFile: ' (Waiting for file)',
    uploadingCount: ' uploading...',
    viewDetails: 'View',
    selectToResume: 'Select file to resume',
    cancel: 'Cancel',
    resume: 'Resume',
    pause: 'Pause',
    storageUsed: 'Storage Used',
    totalFiles: 'Total Files',
    dashboard: 'Dashboard',
    storageDashboard: 'Storage Space',
    storageOverview: 'Storage usage',
    largestFile: 'Largest File',
    spaceByType: 'Space by File Type',
    filesCount: 'files',
    searchFiles: 'Search files...',
    deleteSuccess: 'File deleted successfully',
    renameSuccess: 'File renamed successfully',
    copyError: 'Failed to copy to clipboard',
    openSource: 'Open Source on GitHub',
    storageProvider: 'Storage Provider',
    savedProfiles: 'Saved Profiles',
    newProfile: 'Create New Profile',
    existingProfiles: 'Existing Profiles',
    profileName: 'Profile Name',
    corsError: 'Cannot fetch text content (CORS restriction).',
    openInBrowser: 'Open in Browser',
    previewNotAvailable: 'Preview not available for',
    previewNotAvailableEnd: 'files.',
    downloadFile: 'Download File',
    openInNewTab: 'Open in new tab',
    noSearchResults: 'No files match your search.',
  },
  zh: {
    appTitle: '云存储上传工具',
    connectedTo: '已连接至',
    notConnected: '未连接',
    settings: '设置',
    upload: '上传文件',
    uploadQueue: '上传队列',
    dragDrop: '将文件拖拽到此处',
    supportsLarge: '支持大文件上传，支持拖拽文件夹',
    browseFiles: '选择文件',
    noFiles: '存储桶中没有文件。',
    name: '名称',
    size: '大小',
    lastModified: '最后修改时间',
    actions: '操作',
    pleaseConfigure: '请先配置您的云存储密钥以继续。',
    checkConfig: '检查配置',
    storageSettings: '云存储配置',
    accessKeyId: 'Access Key ID',
    secretAccessKey: 'Secret Access Key',
    bucketName: '存储桶名称 (Bucket)',
    region: '存储区域 (Region)',
    endpoint: 'API 接口地址 (Endpoint)',
    publicDomain: '公网访问域名 (可选)',
    sitePassword: '全站访问密码 (可选，防爬虫抓取)',
    continue: '继续',
    back: '返回',
    saveConfig: '保存配置',
    confirmDelete: '确定要删除这个文件吗？',
    confirmDeleteProfile: '确定要删除这个配置吗？',
    confirmAction: '二次确认',
    copyLink: '复制链接',
    copied: '链接已复制到剪贴板！',
    failedDelete: '删除失败',
    failedRename: '重命名失败',
    failedDownload: '下载失败',
    emptyFileError: '不支持上传文件夹或 0 字节的空文件',
    connecting: '连接中...',
    connectionFailed: '连接失败',
    paused: ' (已暂停)',
    waitingForFile: ' (等待选中文件)',
    uploadingCount: ' 个文件上传中...',
    viewDetails: '查看',
    selectToResume: '选择文件继续',
    cancel: '取消',
    resume: '继续',
    pause: '暂停',
    configure: '配置存储',
    files: '文件列表',
    uploading: '正在上传...',
    uploadSuccess: '上传完成',
    uploadFailed: '上传失败',
    clearCompleted: '清除已完成',
    close: '关闭',
    preview: '预览文件',
    copyUrl: '复制公网链接',
    download: '下载文件',
    rename: '重命名',
    delete: '删除',
    date: '时间',
    storageUsed: '已用空间',
    totalFiles: '文件总数',
    dashboard: '仪表盘',
    storageDashboard: '存储空间',
    storageOverview: '空间使用情况',
    largestFile: '最大文件',
    spaceByType: '各类文件空间占比',
    filesCount: '个文件',
    searchFiles: '搜索文件...',
    deleteSuccess: '文件删除成功',
    renameSuccess: '文件重命名成功',
    copyError: '复制到剪贴板失败',
    openSource: '在 GitHub 上查看开源代码',
    storageProvider: '云存储服务商',
    savedProfiles: '已存配置 (Profiles)',
    newProfile: '创建新配置',
    existingProfiles: '现有配置',
    profileName: '配置名称 (给这个配置起个名字)',
    corsError: '无法获取文本内容 (CORS 跨域限制)。',
    openInBrowser: '在浏览器中打开',
    previewNotAvailable: '无法预览后缀为',
    previewNotAvailableEnd: '的文件。',
    downloadFile: '下载文件',
    openInNewTab: '在新标签页中打开',
    noSearchResults: '没有匹配的文件。',
  }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const [theme, setThemeState] = useState<Theme>('dark');

  // Initializes from localStorage/browser prefs on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('csu_lang') as Language;
    if (savedLang && (savedLang === 'en' || savedLang === 'zh')) {
      setLang(savedLang);
    } else {
      const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
      setLang(browserLang);
    }

    const savedTheme = localStorage.getItem('csu_theme') as Theme;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeState(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setThemeState(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const handleSetLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('csu_lang', newLang);
  };

  const handleSetTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('csu_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] || key;
  };

  // Remove the early return that causes context to be undefined during SSR
  return (
    <I18nContext.Provider value={{ lang, setLang: handleSetLang, theme, setTheme: handleSetTheme, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
