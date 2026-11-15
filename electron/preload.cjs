const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,
  saveProject: (data, name) => ipcRenderer.invoke('project:save', { data, name }),
  openProject: () => ipcRenderer.invoke('project:open'),
  saveFile: (payload) => ipcRenderer.invoke('file:save', payload),
  openImage: () => ipcRenderer.invoke('image:open'),
  toggleFullscreen: () => ipcRenderer.invoke('window:fullscreen'),
  appInfo: () => ipcRenderer.invoke('app:info'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  cancelUpdate: () => ipcRenderer.invoke('updates:cancel'),
  openReleases: () => ipcRenderer.invoke('updates:open-releases'),
  onUpdateProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on('updates:progress', listener);
    return () => ipcRenderer.removeListener('updates:progress', listener);
  },
});
