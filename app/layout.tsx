import type { Metadata } from "next";
import localFont from "next/font/local";
import { ThemeProvider } from "./_components/ThemeProvider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://billionaire-sabari-dm.netlify.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Billionaire Sabari",
    template: "%s · Billionaire Sabari",
  },
  description:
    "Billionaire Sabari: documenting the road from zero to a billion. Digital marketing, AI automation and building in public.",
  applicationName: "Billionaire Sabari",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Billionaire Sabari",
    title: "Billionaire Sabari",
    description: "Documenting the road from zero to a billion, one post at a time.",
    images: [{ url: "/sabari.webp", width: 720, height: 720, alt: "Billionaire Sabari" }],
  },
  twitter: {
    card: "summary",
    title: "Billionaire Sabari",
    description: "Documenting the road from zero to a billion, one post at a time.",
    images: ["/sabari.webp"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans min-h-screen bg-[#fafafc] text-neutral-900 antialiased selection:bg-neutral-200 selection:text-black dark:bg-[#09090b] dark:text-neutral-100 dark:selection:bg-neutral-800 dark:selection:text-white`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
