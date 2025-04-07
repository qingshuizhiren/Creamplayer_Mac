interface ElectronAPI {
  invoke: (channel: string, data?: any) => Promise<any>;
  setDownloadPath: () => Promise<string | null>;
  getDownloadPath: () => Promise<string>;
  onDownloadProgress: (callback: (progress: number) => void) => void;
  removeDownloadProgress: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {}; 