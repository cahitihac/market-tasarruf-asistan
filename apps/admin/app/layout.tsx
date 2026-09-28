import type { Metadata } from 'next';
import { AdminShell } from '../src/components';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Ops Admin',
  description: 'Internal ingestion review dashboard',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AdminShell>{children}</AdminShell></body>
    </html>
  );
}
