import React, { useEffect, useRef, useState } from 'react';

const ChartBox = ({ height = 120, width = '100%', className = '', children }) => {
  const boxRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = boxRef.current;
    if (!node) return undefined;
    let raf;
    const updateReady = () => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      const hidden = style.display === 'none' || style.visibility === 'hidden';
      setReady(rect.width > 1 && rect.height > 1 && !hidden);
    };
    const scheduleUpdate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateReady);
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    document.addEventListener('visibilitychange', scheduleUpdate);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => scheduleUpdate());
      observer.observe(node);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', scheduleUpdate);
      document.removeEventListener('visibilitychange', scheduleUpdate);
      if (observer) observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={boxRef}
      className={className}
      style={{ width, height, minWidth: 1, minHeight: 1, display: 'block' }}
    >
      {ready ? children : null}
    </div>
  );
};

export default ChartBox;
