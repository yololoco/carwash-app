import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { OfflineIndicator } from "@/components/shared/offline-indicator";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "myWash — Tu auto, tu estilo, tu wash",
  description:
    "Lavado de autos a domicilio en minutos. Solicita un lavado y un lavador profesional va a ti.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "myWash",
  },
  openGraph: {
    title: "myWash",
    description: "Lavado de autos a domicilio. Solicita y un lavador profesional va a ti.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-sans)]">
        <ClerkProvider>
          <NextIntlClientProvider messages={messages}>
            <ErrorBoundary>
              {children}
              <OfflineIndicator />
              <Toaster position="top-center" />
            </ErrorBoundary>
          </NextIntlClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
