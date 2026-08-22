import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InternForge — by Yumaris Agency | Verified Internship Platform",
  description:
    "InternForge by Yumaris Agency — a production-ready internship management platform that turns internships into measurable skills, verified work, mentor feedback, and career-ready evidence.",
  keywords: ["internship", "mentorship", "verified skills", "portfolio", "career", "Yumaris", "platform"],
  authors: [{ name: "Yumaris Agency" }],
  icons: {
    icon: "/logo-icon.jpg",
    shortcut: "/logo-icon.jpg",
    apple: "/logo-icon.jpg",
  },
  openGraph: {
    title: "InternForge — by Yumaris Agency",
    description: "Turn internships into measurable skills, verified work, and career-ready evidence.",
    siteName: "InternForge",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
