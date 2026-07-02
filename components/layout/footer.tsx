import Link from "next/link";
import { Github, Instagram, Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/data/profile";

const footerLinks = [
  {
    label: "LinkedIn",
    href: siteConfig.author.linkedin,
    icon: Linkedin,
  },
  {
    label: "GitHub",
    href: siteConfig.author.github,
    icon: Github,
  },
  {
    label: "Email",
    href: `mailto:${siteConfig.author.email}`,
    icon: Mail,
  },
  {
    label: "Instagram",
    href: siteConfig.author.instagram,
    icon: Instagram,
  },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-background/88">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/8 to-transparent" />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <p className="text-3xl font-semibold text-foreground sm:text-4xl">
          Hambali Fadib
        </p>
        <p className="mt-4 max-w-prose text-sm leading-6 text-muted-foreground">
          Software Quality Assurance Engineer focused on business-critical
          systems, structured quality decisions, and enterprise process
          integrity.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {footerLinks.map((link) => {
            const Icon = link.icon;
            const isExternal = link.href.startsWith("http");

            return (
              <Button
                key={link.label}
                asChild
                variant="outline"
                className="h-10 rounded-full border-border/80 bg-card/70 px-4 text-muted-foreground shadow-none hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
              >
                <Link
                  href={link.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <p className="mt-10 text-xs leading-5 text-muted-foreground">
          {currentYear} {siteConfig.author.name}. Built for fast scanning,
          deep evaluation, and AI-assisted navigation.
        </p>
      </div>
    </footer>
  );
}
