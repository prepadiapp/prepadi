import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers"; 
import { Toaster } from "sonner";
import { UserActivityTracker } from "@/components/UserActivityTracker";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Prepadi - WAEC/JAMB Exam Simulator",
  description: "Practice for your WAEC/JAMB exams with real questions.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prepadi",
  },
};

export const viewport: Viewport = {
  themeColor: "#4B71FE",
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
      <body
        className={`${poppins.className} antialiased`}
      >
        <Providers>
          <UserActivityTracker />
          <main className="min-h-screen bg-gray-50">
            {children}
          </main>
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  );
}