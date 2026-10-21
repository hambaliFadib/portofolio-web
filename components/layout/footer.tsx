import Link from "next/link";
import { Github, Instagram, Linkedin, Mail } from "lucide-react";
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
    <footer className="border-t border-border/40 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center">
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
              <Link
                key={link.label}
                href={link.href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 rounded-md border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors duration-200 hover:border-foreground/30 hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
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
