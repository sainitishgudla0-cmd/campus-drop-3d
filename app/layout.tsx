import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Caveat_Brush, Outfit } from "next/font/google";
import { SmoothScroll } from "@/components/ui/SmoothScroll";
import "./globals.css";
import "./home.css";
import "./auth.css";

/* Festivent's hero lettering is custom SVG; Caveat Brush (OFL) is the closest legal match, tuned in CSS. */
const brush = Caveat_Brush({ subsets: ["latin"], weight: "400", variable: "--f-brush", display: "swap" });
/* Stand-in for Festivent's Metro Sans (display + body) */
const sans = Outfit({ subsets: ["latin"], variable: "--f-sans", display: "swap" });
/* Stand-in for Festivent's Futura PT Condensed ExtraBold (sticker labels) */
const cond = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--f-cond", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3300"),
  title: { default: "CampusDrop · Your campus. Your people.", template: "%s · CampusDrop" },
  description: "The friendship-first social network for verified university students. Get a weekly drop of people who share your interests, and create or join campus plans together.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#ff5a36", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${brush.variable} ${sans.variable} ${cond.variable}`} suppressHydrationWarning>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
