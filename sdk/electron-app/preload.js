const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gently', {
  // Setup
  isFirstBoot: () => ipcRenderer.invoke('is-first-boot'),
  getSSHPubKey: () => ipcRenderer.invoke('get-ssh-pubkey'),
  completeSetup: (data) => ipcRenderer.invoke('complete-setup', data),

  // Projects
  createProject: (data) => ipcRenderer.invoke('create-project', data),
  addClan: (data) => ipcRenderer.invoke('add-clan', data),
  collapse: (data) => ipcRenderer.invoke('collapse', data),

  // Stamps
  getStamp: (data) => ipcRenderer.invoke('get-stamp', data),

  // Claude CLI
  cliSend: (data) => ipcRenderer.invoke('cli-send', data),

  // Git
  gitHash: (data) => ipcRenderer.invoke('git-hash', data),

  // Windows
  spawnWindow: (data) => ipcRenderer.invoke('spawn-window', data),

  // Events from main
  onConstantsLoaded: (cb) => ipcRenderer.on('constants-loaded', (e, data) => cb(data)),
  onWindowData: (cb) => ipcRenderer.on('window-data', (e, data) => cb(data)),
  onCLIOutput: (cb) => ipcRenderer.on('cli-output', (e, data) => cb(data)),
});
