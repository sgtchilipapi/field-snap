import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Field-Snap",
    short_name: "Field-Snap",
    description: "Capture and route construction documents into the right Google Drive folders.",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F1E6",
    theme_color: "#12243A",
    icons: [
      {
        src: "/icon?size=192",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon?size=512",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}

