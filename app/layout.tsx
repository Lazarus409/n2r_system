import type { Metadata, Viewport } from "next";
// Fonts are bundled with the app (no request to Google at build or run time).
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import { splashHideScript, themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  // Public address of the site, used for link previews (WhatsApp, Facebook). Set APP_URL in production.
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "National Alumni Register", template: "%s · National Alumni Register" },
  description: "Join the ODASCO Past Students Association National Alumni Register.",
  applicationName: "National Alumni Register",
  appleWebApp: { capable: true, title: "Alumni Register", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
  openGraph: {
    title: "Join the ODASCO National Alumni Register",
    description: "Register with the ODASCO Past Students Association in about two minutes.",
    images: ["/logo.png"],
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f3707" },
    { media: "(prefers-color-scheme: dark)", color: "#071c04" },
  ],
};

/** Branded loading screen shown on the first page load of a session. Pure HTML/CSS so it paints before any JavaScript runs. */
function Splash() {
  return (
    <div id="splash" aria-hidden="true">
      <div className="splash-inner">
        <div className="splash-logo">
          <span className="splash-ring" />
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so it loads with the HTML, before hydration */}
          <img src="/logo.png" alt="" width={132} height={132} fetchPriority="high" />
        </div>
        <span className="splash-eyebrow">ODASCO Past Students Association</span>
        <span className="splash-title">National Alumni Register</span>
        <span className="splash-bar"><i /></span>
        <span className="splash-motto">Knowledge · Truth · Service</span>
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the head script sets data-theme and splash classes on <html> before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Splash />
        {children}
        <script dangerouslySetInnerHTML={{ __html: splashHideScript }} />
      </body>
    </html>
  );
}
