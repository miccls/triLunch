import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "triLunch",
  description: "Modern lunch spot discovery for teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-osttra-rose selection:text-white bg-dark-bg text-gray-200">
        {children}
      </body>
    </html>
  );
}
