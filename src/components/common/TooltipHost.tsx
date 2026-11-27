'use client';

import { useEffect, useRef, useState } from 'react';

// One app-wide tooltip for anything with a data-tooltip attribute. It follows
// the cursor, appears faster than the browser's built-in title tooltip, and
// treats the first line as a heading.
const SHOW_DELAY_MS = 300;
const OFFSET = 14;

interface TipState {
  text: string;
  x: number;
  y: number;
}

export default function TooltipHost() {
  const [tip, setTip] = useState<TipState | null>(null);
  const state = useRef({
    target: null as HTMLElement | null,
    timer: 0 as number | ReturnType<typeof setTimeout>,
    visible: false,
    pressed: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const s = state.current;

    const hide = () => {
      clearTimeout(s.timer);
      s.target = null;
      s.visible = false;
      setTip(null);
    };

    const onOver = (e: PointerEvent) => {
      if (s.pressed) return;
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tooltip]') ?? null;
      if (target === s.target) return;
      clearTimeout(s.timer);
      s.target = target;
      if (!target?.dataset.tooltip) {
        s.visible = false;
        setTip(null);
        return;
      }
      const show = () => {
        if (s.target !== target) return;
        s.visible = true;
        setTip({ text: target.dataset.tooltip ?? '', x: s.x, y: s.y });
      };
      // Moving straight from one block to the next keeps the tooltip up
      if (s.visible) show();
      else s.timer = setTimeout(show, SHOW_DELAY_MS);
    };

    const onMove = (e: PointerEvent) => {
      s.x = e.clientX;
      s.y = e.clientY;
      if (s.visible) setTip(prev => (prev ? { ...prev, x: s.x, y: s.y } : prev));
    };

    // Clicking or dragging a block hides the tooltip until the press ends
    const onDown = () => {
      s.pressed = true;
      hide();
    };
    const onUp = () => {
      s.pressed = false;
    };

    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    document.addEventListener('dragstart', hide);
    document.addEventListener('wheel', hide, { passive: true });
    document.addEventListener('keydown', hide);
    window.addEventListener('blur', hide);
    return () => {
      clearTimeout(s.timer);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      document.removeEventListener('dragstart', hide);
      document.removeEventListener('wheel', hide);
      document.removeEventListener('keydown', hide);
      window.removeEventListener('blur', hide);
    };
  }, []);

  if (!tip) return null;

  const [heading, ...rest] = tip.text.split('\n');
  // Flip to the other side of the cursor near the right or bottom edge
  const flipX = tip.x > window.innerWidth - 300;
  const flipY = tip.y > window.innerHeight - 160;

  return (
    <div
      role="tooltip"
      className="fixed z-[80] pointer-events-none max-w-xs rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
      style={{
        left: flipX ? tip.x - OFFSET : tip.x + OFFSET,
        top: flipY ? tip.y - OFFSET : tip.y + OFFSET,
        transform: `translate(${flipX ? '-100%' : '0'}, ${flipY ? '-100%' : '0'})`,
      }}
    >
      <div className="font-semibold">{heading}</div>
      {rest.length > 0 && <div className="mt-0.5 whitespace-pre-line text-gray-300">{rest.join('\n')}</div>}
    </div>
  );
}
