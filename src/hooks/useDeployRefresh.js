import { useEffect, useRef } from 'react';

const DEPLOY_SIGNATURE_KEY = 'poke_deploy_signature';
const DEPLOY_CHECK_INTERVAL = 60 * 1000;

const getManifestUrl = () => {
  const base = process.env.PUBLIC_URL || '';
  return `${base}/asset-manifest.json`;
};

async function clearBrowserCaches() {
  if ('caches' in window) {
    const keys = await window.caches.keys();
    await Promise.all(keys.map(key => window.caches.delete(key)));
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
}

async function forceReload() {
  try {
    await clearBrowserCaches();
  } catch (error) {
    console.warn('Failed to clear caches before deploy refresh:', error);
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
}

export default function useDeployRefresh({ defer = false } = {}) {
  const deferRef = useRef(defer);
  const pendingRefreshRef = useRef(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    deferRef.current = defer;
    if (!defer && pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      forceReload();
    }
  }, [defer]);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return undefined;

    let isCancelled = false;

    const checkDeploy = async () => {
      if (checkingRef.current || isCancelled) return;
      checkingRef.current = true;

      try {
        const url = `${getManifestUrl()}?deploy_check=${Date.now()}`;
        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!response.ok) return;

        const signature = await response.text();
        const previousSignature = window.localStorage.getItem(DEPLOY_SIGNATURE_KEY);

        if (!previousSignature) {
          window.localStorage.setItem(DEPLOY_SIGNATURE_KEY, signature);
          return;
        }

        if (previousSignature !== signature) {
          window.localStorage.setItem(DEPLOY_SIGNATURE_KEY, signature);
          if (deferRef.current) {
            pendingRefreshRef.current = true;
            return;
          }
          await forceReload();
        }
      } catch (error) {
        console.warn('Deploy refresh check failed:', error);
      } finally {
        checkingRef.current = false;
      }
    };

    checkDeploy();
    const intervalId = window.setInterval(checkDeploy, DEPLOY_CHECK_INTERVAL);
    const handleFocus = () => checkDeploy();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkDeploy();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
}
