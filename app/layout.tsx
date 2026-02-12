import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GradientBackground } from "./components/gradient-bg";
import { ThemeToggle } from "./components/theme-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ConsciousHQ Visitor Kiosk",
  description: "Visitor check-in kiosk for ConsciousHQ, Indiranagar, Bangalore",
};

/* Inline script that runs before first paint to set the correct theme class,
   preventing a flash of the wrong color scheme. */
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-base text-text`}
      >
        <GradientBackground />

        <div className="relative z-10">{children}</div>

        <ThemeToggle />
      </body>
    </html>
  );
}
