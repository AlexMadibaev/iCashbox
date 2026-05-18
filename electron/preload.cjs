const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icashboxPrint', {
  listPrinters: () => ipcRenderer.invoke('icashbox:list-printers'),
  print: (payload) => ipcRenderer.invoke('icashbox:print', payload)
});
