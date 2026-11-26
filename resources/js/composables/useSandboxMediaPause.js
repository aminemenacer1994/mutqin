/**
 * Pause inactive media while the sandbox tab is hidden (Group J5 performance).
 */
export function useSandboxMediaPause() {
  const pauseMedia = () => {
    document.querySelectorAll('video, audio').forEach((el) => {
      if (el.paused) {
        return;
      }
      try {
        el.pause();
      } catch {
        /* ignore */
      }
    });
  };

  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      pauseMedia();
    }
  };

  const mount = () => {
    document.addEventListener('visibilitychange', onVisibility);
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) {
      pauseMedia();
    }
  };

  const unmount = () => {
    document.removeEventListener('visibilitychange', onVisibility);
  };

  return { mount, unmount, pauseMedia };
}