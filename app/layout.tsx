import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import "@/lib/server/env";

export const metadata: Metadata = {
  applicationName: "Field-Snap",
  title: {
    default: "Field-Snap",
    template: "%s | Field-Snap"
  },
  description: "Field-Snap keeps job and admin documents organized from the field to review.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Field-Snap"
  },
  icons: {
    icon: [
      { url: "/icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/icon?size=512", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#12243A"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

