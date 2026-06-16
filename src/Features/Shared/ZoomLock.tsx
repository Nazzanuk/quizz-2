'use client';

import { useEffect } from 'react';

// Android Chrome honours the viewport meta (maximum-scale=1, user-scalable=no),
// so pinch- and focus-zoom are already disabled there. iOS Safari ignores that
// meta for pinch-zoom (since iOS 10), and CSS touch-action only kills double-tap.
// So we block the remaining zoom gestures here, covering both platforms:
//   - iOS Safari pinch (gesture* events — WebKit-only, never fire on Android)
//   - two-finger touchmove: belt-and-braces pinch block on Android/Chromium too
//   - trackpad/mouse ctrl+wheel zoom (desktop + ChromeOS)
//   - keyboard ctrl/cmd + (=/-/0) zoom
// Renders nothing; mounted once at the layout level.
export default function ZoomLock() {
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].includes(e.key)) {
        e.preventDefault();
      }
    };

    // gesturestart/change/end are non-standard Safari-only events.
    document.addEventListener('gesturestart', prevent);
    document.addEventListener('gesturechange', prevent);
    document.addEventListener('gestureend', prevent);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('gesturestart', prevent);
      document.removeEventListener('gesturechange', prevent);
      document.removeEventListener('gestureend', prevent);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return null;
}
