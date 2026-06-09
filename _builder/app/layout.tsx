import './globals.css';
import React from 'react';

export const metadata = {
  title: 'ViziWiki Builder',
  description: 'Phase 1 vertical slice',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
