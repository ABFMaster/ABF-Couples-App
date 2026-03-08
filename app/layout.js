import { Geist, Geist_Mono } from "next/font/google";
import OnboardingGuard from "@/components/OnboardingGuard";
import NavBadges from "@/components/NavBadges";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ABF",
  description: "Always Be Flirting — your relationship companion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ABF" />
        <meta name="theme-color" content="#E8614D" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnboardingGuard>
          <div className="pb-20 min-h-screen flex flex-col items-center">
            <div className="w-full max-w-lg">
              {children}
            </div>
          </div>
          <NavBadges />
        </OnboardingGuard>
      </body>
    </html>
  );
}
