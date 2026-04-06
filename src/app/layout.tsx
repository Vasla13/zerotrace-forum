import type { Metadata } from "next";
import localFont from "next/font/local";
import { Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const cyberBrush = localFont({
  src: "./fonts/CyberBrush.ttf",
  variable: "--font-cyber-brush",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NEST",
    template: "%s | NEST",
  },
  description: "Forum simple avec accès par code, posts, commentaires et profils.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${spaceGrotesk.variable} ${cyberBrush.variable}`}
    >
      <body className="min-h-screen antialiased">
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <div aria-hidden="true" className="forum-background" />
            <Header />
            <div className="forum-main-shell">
              <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-12 lg:px-8">
                {children}
              </main>
            </div>
            <MobileBottomNav />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
