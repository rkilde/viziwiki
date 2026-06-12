'use client';
import React, { useEffect, useRef, useState } from 'react';

// Report-a-bug affordance (UI ONLY — no submission wired yet). Flow:
//   chip → "circle" (pencil cursor, draw over the page) → "describe" (textarea)
//   → "done" (success toast, auto-dismiss). Drawing is freehand on an SVG
//   overlay; nothing is persisted. Wire the actual report later off `onSubmit`.
type Phase = 'idle' | 'circle' | 'describe' | 'done';

export function BugReporter() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [strokes, setStrokes] = useState<string[]>([]); // committed freehand paths
  const [live, setLive] = useState('');                 // in-progress path
  const [text, setText] = useState('');
  const drawing = useRef(false);
  const liveRef = useRef('');

  const reset = () => { setPhase('idle'); setStrokes([]); setLive(''); setText(''); drawing.current = false; liveRef.current = ''; };
  const begin = () => { setStrokes([]); setLive(''); setText(''); setPhase('circle'); };

  // Esc backs out of circle/describe
  useEffect(() => {
    if (phase !== 'circle' && phase !== 'describe') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); reset(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [phase]);

  // the success notice auto-dismisses
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(reset, 2800);
    return () => clearTimeout(t);
  }, [phase]);

  const down = (e: React.PointerEvent) => { drawing.current = true; liveRef.current = `M ${e.clientX} ${e.clientY}`; setLive(liveRef.current); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; liveRef.current += ` L ${e.clientX} ${e.clientY}`; setLive(liveRef.current); };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const d = liveRef.current; liveRef.current = ''; setLive('');
    if (d && d.indexOf('L') >= 0) { setStrokes((s) => [...s, d]); setPhase('describe'); } // a real stroke → ask for a description
  };

  return (
    <>
      <button className="pe-bug-chip" onClick={begin} title="Report a bug">
        <IcBug /> Report bug
      </button>

      {(phase === 'circle' || phase === 'describe') && (
        <div className="pe-bug-layer">
          <svg className="pe-bug-canvas" xmlns="http://www.w3.org/2000/svg">
            {strokes.map((d, i) => <path key={i} d={d} />)}
            {live && <path d={live} />}
          </svg>

          {phase === 'circle' && (
            <div className="pe-bug-draw" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}>
              <div className="pe-bug-banner">
                <IcPencil /> Use the pencil to circle the area affected by the bug
                <button className="pe-bug-cancel" onClick={reset}>Cancel</button>
              </div>
            </div>
          )}

          {phase === 'describe' && (
            <div className="pe-bug-modal" onMouseDown={(e) => e.stopPropagation()}>
              <div className="pe-bug-modal-title">Describe the issue</div>
              <textarea className="pe-bug-text" autoFocus placeholder="What's wrong with the circled area?" value={text} onChange={(e) => setText(e.target.value)} />
              <div className="pe-bug-actions">
                <button onClick={reset}>Cancel</button>
                <button className="primary" onClick={() => setPhase('done')}>Submit</button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'done' && (
        <div className="pe-bug-toast"><IcCheck /> The issue has been reported and will be fixed shortly.</div>
      )}
    </>
  );
}

const IcBug = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m8 2 1.88 1.88M14.12 3.88 16 2" /><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1" /><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6" /><path d="M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4" /></svg>);
const IcPencil = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>);
const IcCheck = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>);
