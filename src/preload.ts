import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProviders: () => ipcRenderer.invoke('get-providers'),
  getEnv: () => ipcRenderer.invoke('get-env'),
  saveProvider: (providerData: any) => ipcRenderer.invoke('save-provider', providerData),
  setEnv: (vars: any) => ipcRenderer.invoke('set-env', vars),
  fetchModels: (data: any) => ipcRenderer.invoke('fetch-models', data),
  closeWindow: () => ipcRenderer.invoke('close-window')
});
