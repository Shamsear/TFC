import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { ToastProvider } from "@/components/ui/ToastProvider";
import PWARegistry from "@/components/PWARegistry";
import { AutoRefresh } from "@/components/AutoRefresh";

export const metadata: Metadata = {
  title: "Turf Cats",
  description: "Multi-season eFootball tournament management platform",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json?v=3',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TFC',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <SessionProvider>
          <ToastProvider>
            <PWARegistry />
            <AutoRefresh />
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
