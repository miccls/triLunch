import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "triLunch Arcade",
  description: "Discover the perfect lunch spots around you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-arcade-accent selection:text-arcade-bg">
        <div className="crt-overlay"></div>
        {children}
      </body>
    </html>
  );
}
