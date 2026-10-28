import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import { Header } from "@/features/navigation";
import { PageMotion } from "@/components/layout/page-motion";
import { IdentityProvider, type Appearance, type Persona } from "@/components/identity/identity-provider";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const persona: Persona = requestHeaders.get("x-portfolio-persona") === "fullstack" ? "fullstack" : "qa";
  const appearance: Appearance = requestHeaders.get("x-portfolio-appearance") === "dark" ? "dark" : "light";
  return (
    <html lang="en" className={`scroll-smooth ${appearance}`} data-persona={persona} data-appearance={appearance}>
      <body className="font-sans antialiased">
        <IdentityProvider initialPersona={persona} initialAppearance={appearance}>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <PageMotion>{children}</PageMotion>
          </div>
          <Analytics />
        </IdentityProvider>
      </body>
    </html>
  );
}
