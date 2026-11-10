import type { Metadata, Viewport } from "next";
// Fonts are bundled with the app (no request to Google at build or run time).
import "@fontsource/bricolage-grotesque/latin-600.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import { themeInitScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  // Public address of the site, used for link previews (WhatsApp, Facebook). Set APP_URL in production.
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: { default: "National Alumni Register", template: "%s · National Alumni Register" },
  description: "Join the ODASCO Past Students Association National Alumni Register.",
  applicationName: "National Alumni Register",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the theme script sets data-theme on <html> before React hydrates
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
