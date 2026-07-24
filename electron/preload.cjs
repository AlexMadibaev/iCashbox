const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icashboxPrint', {
  listPrinters: () => ipcRenderer.invoke('icashbox:list-printers'),
  print: (payload) => ipcRenderer.invoke('icashbox:print', payload)
});

contextBridge.exposeInMainWorld('icashboxSystem', {
  archiveOrders: (payload) => ipcRenderer.invoke('icashbox:archive-orders', payload),
  getAutoLaunch: () => ipcRenderer.invoke('icashbox:get-auto-launch'),
  loadOrderArchive: (jsonPath) => ipcRenderer.invoke('icashbox:load-order-archive', jsonPath),
  getLicense: () => ipcRenderer.invoke('icashbox:get-license'),
  getLiveUrls: () => ipcRenderer.invoke('icashbox:get-live-urls'),
  getNetworkTime: () => ipcRenderer.invoke('icashbox:network-time'),
  resetLicense: () => ipcRenderer.invoke('icashbox:reset-license'),
  verifyLicense: () => ipcRenderer.invoke('icashbox:verify-license'),
  getRemoteLiveSettings: () => ipcRenderer.invoke('icashbox:get-remote-live-settings'),
  selectExportDirectory: () => ipcRenderer.invoke('icashbox:select-export-directory'),
  setAutoLaunch: (openAtLogin) => ipcRenderer.invoke('icashbox:set-auto-launch', openAtLogin),
  setRemoteLiveSettings: (settings) => ipcRenderer.invoke('icashbox:set-remote-live-settings', settings),
  updateLiveSnapshot: (payload) => ipcRenderer.invoke('icashbox:update-live-snapshot', payload)
});
