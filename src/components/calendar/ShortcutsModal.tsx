'use client';

import { X } from 'lucide-react';
import DismissLayer, { closeOnBackdrop } from '@/components/common/DismissLayer';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const mod = isMac ? '⌘' : 'Ctrl';

const groups: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Blocks',
    items: [
      { keys: ['Double-click day'], label: 'Add a block (Grid view)' },
      { keys: ['Double-click block'], label: 'Edit a block' },
      { keys: ['Shift', 'Click'], label: 'Select several blocks' },
      { keys: ['Drag'], label: 'Move blocks (selected blocks move together)' },
      { keys: [mod, 'C'], label: 'Copy selected blocks' },
      { keys: [mod, 'V'], label: 'Paste them one week later' },
      { keys: [mod, 'Z'], label: 'Undo' },
    ],
  },
  {
    title: 'General',
    items: [
      { keys: ['Double-click campaign'], label: 'Edit a campaign (in Filters)' },
      { keys: ['Esc'], label: 'Close a pop-up' },
      { keys: ['?'], label: 'Show these shortcuts' },
    ],
  },
];

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onMouseDown={closeOnBackdrop(onClose)}>
      <DismissLayer onClose={onClose} />
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[calc(100vh-3rem)] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Keyboard shortcuts</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {groups.map(group => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase mb-2">{group.title}</h3>
              <ul className="space-y-1.5">
                {group.items.map(item => (
                  <li key={item.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map(key => (
                        <kbd
                          key={key}
                          className="px-1.5 py-0.5 rounded border border-gray-300 bg-gray-50 text-xs text-gray-700 font-sans whitespace-nowrap"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
