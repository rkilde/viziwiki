'use client';
import React from 'react';

/**
 * Inline-editable text. The live component IS the editing surface (WYSIWYG):
 * the value renders as normal text; click it and type. Commits on blur or Enter,
 * so React never re-renders mid-keystroke (no cursor jumps).
 */
export function Editable({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  return (
    <span
      data-edit
      role="textbox"
      tabIndex={0}
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? '';
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    >
      {value}
    </span>
  );
}
