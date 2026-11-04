import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ad Flow - Advertising Production Workflow",
  description: "Advertising production workflow management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
