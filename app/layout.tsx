import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chat Space MVP',
  description: 'Local AI chat space with multi-provider support',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
