import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HANS | Inventory & Categories System",
  description: "Enterprise-grade product registry and category organization workspace. Simple, high-performance inventory manager.",
  keywords: ["inventory", "products", "categories", "dashboard", "hans", "postgres", "nextjs"],
  authors: [{ name: "HANS Corp" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="main-content-wrapper">
          {children}
        </div>
        <footer className="footer-credits">
          Developed by Kunal mudaliar
        </footer>
      </body>
    </html>
  );
}
