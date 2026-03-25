export type MyHouseDesktopBridge = {
  isDesktop: true;
  platform: string;
  versions: {
    chrome: string;
    electron: string;
    node: string;
  };
  openExternal: (url: string) => Promise<boolean>;
};

declare global {
  interface Window {
    MyHouseDesktop?: MyHouseDesktopBridge;
  }
}

export function getDesktopBridge(): MyHouseDesktopBridge | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.MyHouseDesktop ?? null;
}
