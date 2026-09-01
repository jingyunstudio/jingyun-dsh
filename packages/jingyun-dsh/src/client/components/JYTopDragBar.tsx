import React from 'react';
import { createPortal } from 'react-dom';

function checkIsTauri() {
  if (typeof window === 'undefined') return false;
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__;
}

export function JYTopDragBar() {
  const [isTauri, setIsTauri] = React.useState(false);

  React.useEffect(() => {
    setIsTauri(checkIsTauri());
  }, []);

  if (!isTauri || typeof document === 'undefined') return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    try {
      const tauri = (window as any).__TAURI__;
      const internals = (window as any).__TAURI_INTERNALS__;
      if (tauri?.window?.getCurrentWindow) {
        tauri.window.getCurrentWindow().startDragging();
      } else if (tauri?.core?.invoke) {
        tauri.core.invoke('app_start_drag');
      } else if (internals?.invoke) {
        internals.invoke('app_start_drag');
      }
    } catch (err) {}
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const tauri = (window as any).__TAURI__;
      const internals = (window as any).__TAURI_INTERNALS__;
      if (tauri?.window?.getCurrentWindow) {
        tauri.window.getCurrentWindow().toggleMaximize();
      } else if (tauri?.core?.invoke) {
        tauri.core.invoke('app_toggle_maximize');
      } else if (internals?.invoke) {
        internals.invoke('app_toggle_maximize');
      }
    } catch (err) {}
  };

  return createPortal(
    <div
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={
        {
          position: 'fixed',
          top: 0,
          left: 0,
          right: '130px',
          height: '32px',
          zIndex: 999998,
          WebkitAppRegion: 'drag',
          pointerEvents: 'auto',
          cursor: 'default',
        } as any
      }
    />,
    document.body
  );
}
