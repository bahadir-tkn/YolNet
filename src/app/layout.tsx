import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YolNet - Canlı Trafik, Taksimetre & Şoför/Yolcu Kokpiti',
  description:
    'Yolcular ve taksi sürücüleri için canlı trafik destekli resmi UKOME taksimetre, güzergah hakemi, ücret denetçisi ve net kâr hesaplayıcı.',
  applicationName: 'YolNet',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'YolNet',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark h-full bg-[#0F172A]">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="YolNet" />
      </head>
      <body className="h-full bg-[#0F172A] text-slate-100 antialiased selection:bg-yellow-400 selection:text-slate-900">
        {children}
      </body>
    </html>
  );
}
