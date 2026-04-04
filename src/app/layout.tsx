import type { Metadata } from "next";
import { Oxanium, Space_Grotesk } from "next/font/google";
import { Header } from "@/components/header";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ZeroTrace",
    template: "%s | ZeroTrace",
  },
  description:
    "Forum cyber avec Firebase Auth, Firestore, posts, commentaires, likes et profils utilisateurs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${spaceGrotesk.variable} ${oxanium.variable}`}
    >
      <body className="min-h-screen antialiased">
        <AppProviders>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
