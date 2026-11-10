import type { MetadataRoute } from "next";

/** Web app manifest: lets members "Add to Home screen". Android builds its launch splash from the name, colours and icons here. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ODASCO National Alumni Register",
    short_name: "Alumni Register",
    description: "Join the ODASCO Past Students Association National Alumni Register.",
    start_url: "/register",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f3707",
    theme_color: "#0f3707",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
