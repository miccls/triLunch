import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "triLunch",
  description: "Discover the perfect lunch spots around you.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
