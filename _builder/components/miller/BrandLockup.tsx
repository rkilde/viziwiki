'use client';
import React from 'react';

// The brand lockup ported from the build-kit mark mockup: the ViziWiki layers
// app-icon, the ViziWiki wordmark, a divider, the Build Kit wordmark, and the
// open-kit squircle mark. Sits on the LEFT of the column-view Topbar, followed
// by a separator and the existing chrome (wiki switcher, …).
const ViziLayers = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

// the "winner" open-kit squircle mark (identical artwork to the mockup card)
const OpenKit = () => (
  <svg viewBox="0 0 96 96" style={{ overflow: 'visible' }}>
    <defs>
      <radialGradient id="bkGc" cx="42%" cy="36%" r="52%"><stop offset="0" stopColor="#22d3ee" stopOpacity=".5" /><stop offset="1" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
      <radialGradient id="bkGp" cx="60%" cy="66%" r="52%"><stop offset="0" stopColor="#7c3aed" stopOpacity=".5" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></radialGradient>
      <linearGradient id="bkTw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#67e8f9" /><stop offset=".5" stopColor="#4f46e5" /><stop offset="1" stopColor="#6d28d9" /></linearGradient>
      <pattern id="bkHt" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.4" cy="1.4" r="1.05" fill="#67e8f9" /></pattern>
      <filter id="bkInk" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2.4" dy="2.6" stdDeviation="0" floodColor="#080a20" floodOpacity="1" /></filter>
      <clipPath id="bkSq"><rect x="0" y="0" width="96" height="96" rx="30" ry="30" /></clipPath>
      <clipPath id="bkCc"><path d="M24 48 H72 L68 78 H28 Z" /></clipPath>
    </defs>
    <g clipPath="url(#bkSq)"><rect width="96" height="96" fill="url(#bkGc)" /><rect width="96" height="96" fill="url(#bkGp)" /></g>
    <rect x="22" y="40" width="52" height="11" rx="4" fill="#4f46e5" transform="rotate(-2 48 45)" />
    <g filter="url(#bkInk)"><path d="M24 48 H72 L68 78 H28 Z" fill="url(#bkTw)" stroke="rgba(255,255,255,.35)" /></g>
    <g clipPath="url(#bkCc)"><rect x="24" y="48" width="48" height="32" fill="url(#bkHt)" opacity=".45" style={{ mixBlendMode: 'overlay' }} /></g>
    <rect x="40" y="60" width="16" height="4" rx="2" fill="rgba(255,255,255,.6)" />
    <g filter="url(#bkInk)"><rect x="31" y="22" width="17" height="14" rx="3" fill="#7c3aed" stroke="rgba(255,255,255,.45)" transform="rotate(-10 39 29)" /></g>
    <g filter="url(#bkInk)"><rect x="50" y="18" width="15" height="13" rx="3" fill="#7c3aed" stroke="rgba(255,255,255,.45)" transform="rotate(11 57 24)" /></g>
  </svg>
);

export function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-mark"><ViziLayers /></span>
      <span className="brand-word"><span className="bw-a">Vizi</span><span className="bw-b">Wiki</span></span>
      <span className="brand-thin" />
      <span className="brand-kit">Build&nbsp;Kit</span>
      <span className="brand-kit-icon"><OpenKit /></span>
    </div>
  );
}
