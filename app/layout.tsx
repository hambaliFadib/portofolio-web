import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { PageMotion } from "@/components/layout/page-motion";
import { LanguageProvider } from "@/components/language-provider";
import { ClarityAIWidget } from "@/components/portfolio/clarity-ai-widget";
import { ThemeProvider } from "@/components/theme-provider";
import { siteConfig } from "@/data/profile";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.title}`,
  },
  description: siteConfig.description,
  authors: [{ name: siteConfig.author.name }],
  generator: "Codex",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <LanguageProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <PageMotion>{children}</PageMotion>
              <Footer />
              <ClarityAIWidget />
            </div>
            <Analytics />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
