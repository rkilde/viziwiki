'use client';
import React from 'react';

/**
 * Inline rich-text edit: the value renders as HTML (so existing <strong>/<br>
 * survive); click and type; commits innerHTML on blur (no re-render mid-keystroke,
 * so no cursor jumps). The live element IS the editing surface — WYSIWYG.
 */
export function RichEditable({
  html,
  onCommit,
  className,
  placeholder,
  as = 'span',
}: {
  html: string;
  onCommit: (next: string) => void;
  className?: string;
  placeholder?: string;
  as?: 'span' | 'p' | 'div';
}) {
  return React.createElement(as, {
    className: `pe-edit ${className || ''}`.trim(),
    contentEditable: true,
    suppressContentEditableWarning: true,
    'data-ph': placeholder,
    dangerouslySetInnerHTML: { __html: html || '' },
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const v = e.currentTarget.innerHTML;
      if (v !== (html || '')) onCommit(v);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      // Enter commits for single-line fields (span); paragraphs/divs keep newlines
      if (e.key === 'Enter' && as === 'span') {
        e.preventDefault();
        (e.currentTarget as HTMLElement).blur();
      }
    },
  });
}
