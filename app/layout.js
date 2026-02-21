import { Geist, Geist_Mono } from "next/font/google";
import OnboardingGuard from "@/components/OnboardingGuard";
import BottomNav from "@/components/BottomNav";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <OnboardingGuard>
          <div className="pb-20">{children}</div>
          <BottomNav />
        </OnboardingGuard>
      </body>
    </html>
  );
}
