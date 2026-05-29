const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icashboxPrint', {
  listPrinters: () => ipcRenderer.invoke('icashbox:list-printers'),
  print: (payload) => ipcRenderer.invoke('icashbox:print', payload)
});

contextBridge.exposeInMainWorld('icashboxSystem', {
  archiveOrders: (payload) => ipcRenderer.invoke('icashbox:archive-orders', payload),
  getAutoLaunch: () => ipcRenderer.invoke('icashbox:get-auto-launch'),
  loadOrderArchive: (jsonPath) => ipcRenderer.invoke('icashbox:load-order-archive', jsonPath),
  getLiveUrls: () => ipcRenderer.invoke('icashbox:get-live-urls'),
  getNetworkTime: () => ipcRenderer.invoke('icashbox:network-time'),
  selectExportDirectory: () => ipcRenderer.invoke('icashbox:select-export-directory'),
  setAutoLaunch: (openAtLogin) => ipcRenderer.invoke('icashbox:set-auto-launch', openAtLogin),
  updateLiveSnapshot: (payload) => ipcRenderer.invoke('icashbox:update-live-snapshot', payload)
});
