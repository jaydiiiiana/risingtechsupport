import React, { useState, useRef, useCallback, useEffect } from 'react';

interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MacWindowProps {
  id: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isMinimized: boolean;
  isFullscreen: boolean;
  isFocused: boolean;
  initialX?: number;
  initialY?: number;
  initialWidth?: number;
  initialHeight?: number;
  onClose: () => void;
  onMinimize: () => void;
  onFullscreen: () => void;
  onFocus: () => void;
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

const MIN_W = 480;
const MIN_H = 320;

const MacWindow: React.FC<MacWindowProps> = ({
  title, icon, children,
  isMinimized, isFullscreen, isFocused,
  initialX = 120, initialY = 80,
  initialWidth = 900, initialHeight = 600,
  onClose, onMinimize, onFullscreen, onFocus
}) => {
  const [win, setWin] = useState<WindowState>({ x: initialX, y: initialY, width: initialWidth, height: initialHeight });
  const [preFullscreen, setPreFullscreen] = useState<WindowState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<ResizeDir>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, winX: 0, winY: 0, winW: 0, winH: 0 });

  useEffect(() => {
    if (isFullscreen && !preFullscreen) {
      setPreFullscreen({ ...win });
    } else if (!isFullscreen && preFullscreen) {
      setWin(preFullscreen);
      setPreFullscreen(null);
    }
  }, [isFullscreen]);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isFullscreen) return;
    onFocus();
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - win.x, y: e.clientY - win.y };
  }, [win.x, win.y, isFullscreen, onFocus]);

  const handleResizeStart = useCallback((e: React.MouseEvent, dir: ResizeDir) => {
    e.stopPropagation();
    e.preventDefault();
    if (isFullscreen) return;
    onFocus();
    setResizeDir(dir);
    resizeStart.current = { x: e.clientX, y: e.clientY, winX: win.x, winY: win.y, winW: win.width, winH: win.height };
  }, [isFullscreen, onFocus, win]);

  useEffect(() => {
    if (!isDragging && !resizeDir) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setWin(prev => ({
          ...prev,
          x: e.clientX - dragOffset.current.x,
          y: Math.max(32, e.clientY - dragOffset.current.y)
        }));
      }
      if (resizeDir) {
        const s = resizeStart.current;
        const dx = e.clientX - s.x;
        const dy = e.clientY - s.y;

        setWin(() => {
          let { winX: x, winY: y, winW: w, winH: h } = s;

          if (resizeDir.includes('e')) w = Math.max(MIN_W, s.winW + dx);
          if (resizeDir.includes('w')) {
            const newW = Math.max(MIN_W, s.winW - dx);
            x = s.winX + (s.winW - newW);
            w = newW;
          }
          if (resizeDir === 's' || resizeDir === 'se' || resizeDir === 'sw') h = Math.max(MIN_H, s.winH + dy);
          if (resizeDir === 'n' || resizeDir === 'ne' || resizeDir === 'nw') {
            const newH = Math.max(MIN_H, s.winH - dy);
            y = Math.max(32, s.winY + (s.winH - newH));
            h = newH;
          }

          return { x, y, width: w, height: h };
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizeDir(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizeDir]);

  const cls = [
    'macos-window',
    isFocused && 'focused',
    isMinimized && 'win-minimized',
    isFullscreen && 'fullscreen',
    'opening'
  ].filter(Boolean).join(' ');

  const baseStyle: React.CSSProperties = isFullscreen ? {} : {
    left: win.x, top: win.y, width: win.width, height: win.height,
  };

  // Minimized = hidden, dock icon handles restore
  if (isMinimized) return null;

  const style: React.CSSProperties = { ...baseStyle };
  const H = 8;

  return (
    <div className={cls} style={style} onMouseDown={() => { if (!isMinimized) onFocus(); }}>
      {/* All-edge Resize Handles */}
      {!isFullscreen && !isMinimized && (
        <>
          <div style={{ position: 'absolute', top: 0, left: H, right: H, height: H, cursor: 'ns-resize', zIndex: 10 }} onMouseDown={e => handleResizeStart(e, 'n')} />
          <div style={{ position: 'absolute', bottom: 0, left: H, right: H, height: H, cursor: 'ns-resize', zIndex: 10 }} onMouseDown={e => handleResizeStart(e, 's')} />
          <div style={{ position: 'absolute', top: H, left: 0, bottom: H, width: H, cursor: 'ew-resize', zIndex: 10 }} onMouseDown={e => handleResizeStart(e, 'w')} />
          <div style={{ position: 'absolute', top: H, right: 0, bottom: H, width: H, cursor: 'ew-resize', zIndex: 10 }} onMouseDown={e => handleResizeStart(e, 'e')} />
          <div style={{ position: 'absolute', top: 0, left: 0, width: H * 2, height: H * 2, cursor: 'nwse-resize', zIndex: 11 }} onMouseDown={e => handleResizeStart(e, 'nw')} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: H * 2, height: H * 2, cursor: 'nesw-resize', zIndex: 11 }} onMouseDown={e => handleResizeStart(e, 'ne')} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: H * 2, height: H * 2, cursor: 'nesw-resize', zIndex: 11 }} onMouseDown={e => handleResizeStart(e, 'sw')} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: H * 2, height: H * 2, cursor: 'nwse-resize', zIndex: 11 }} onMouseDown={e => handleResizeStart(e, 'se')} />
        </>
      )}

      {/* Title Bar */}
      <div className={`window-titlebar${isDragging ? ' dragging' : ''}`} style={{ position: 'relative', zIndex: 20 }} onMouseDown={handleDragStart} onDoubleClick={onFullscreen}>
        <div className="traffic-lights" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
          <div className="traffic-light close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <svg viewBox="0 0 12 12"><path d="M3.5 3.5l5 5M8.5 3.5l-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          </div>
          <div className="traffic-light minimize" onClick={(e) => { e.stopPropagation(); onMinimize(); }}>
            <svg viewBox="0 0 12 12"><path d="M2 6h8" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
          </div>
          <div className="traffic-light maximize" onClick={(e) => { e.stopPropagation(); onFullscreen(); }}>
            <svg viewBox="0 0 12 12"><path d="M3 3h6v6H3z" stroke="currentColor" strokeWidth="1.2" fill="none" /></svg>
          </div>
        </div>
        {icon && <div className="window-icon">{icon}</div>}
        <div className="window-title">{title}</div>
      </div>

      {/* Body */}
      <div className="window-body">
        {children}
      </div>
    </div>
  );
};

export default MacWindow;
