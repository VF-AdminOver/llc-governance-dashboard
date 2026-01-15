const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startBackend: () => ipcRenderer.invoke('start-backend'),
  stopBackend: () => ipcRenderer.invoke('stop-backend'),
  getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
  testProcessSpawn: () => ipcRenderer.invoke('test-process-spawn'),
  onMenuAction: (callback) => ipcRenderer.on('menu-action', callback),
  showAboutDialog: () => {
    const { dialog } = require('@electron/remote');
    dialog.showMessageBox({
      type: 'info',
      title: 'About LLC Governance Dashboard',
      message: 'LLC Governance Dashboard',
      detail: 'Member-managed governance and finance hub for families and LLCs\n\nVersion 1.0.0\nBuilt with Electron',
      buttons: ['OK']
    });
  }
});
