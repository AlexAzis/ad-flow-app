'use client';

import { useEffect, useRef } from 'react';

// Pop-ups render <DismissLayer onClose={...} /> inside their backdrop. Each
// mounted layer joins a stack, and Esc closes only the topmost one, so a
// dialog opened on top of another closes first.
const stack: number[] = [];
let nextId = 1;

export default function DismissLayer({ onClose }: { onClose: () => void }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const id = nextId++;
    stack.push(id);
    document.body.setAttribute('data-dismiss-layer', '');
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      e.preventDefault();
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.removeAttribute('data-dismiss-layer');
    };
  }, []);

  return null;
}

// Backdrop handler: closes only when the press starts on the dark area
// itself, so dragging a text selection out of the dialog doesn't close it
export const closeOnBackdrop = (onClose: () => void) => (e: React.MouseEvent) => {
  if (e.target === e.currentTarget) onClose();
};
