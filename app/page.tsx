import type { Metadata } from "next";
import { DarkEditorialHero, HomepageSections } from "@/features/home";

/**
 * Single-page static portfolio — dark editorial hero (HERO-ASCII-01).
 *
 * Fully static: content from local data files. No CMS,
 * no content API, no dynamic generation, no backend dependency.
 */
export const metadata: Metadata = {
  title: "Hambali Fadib — Software Quality Assurance Engineer",
  description:
    "Portfolio Hambali business-critical risk-based and quality-focused work.",
  keywords: ["QA", "Software Quality", "Portfolio", "Risk"],
  authors: [{ name: "Hambali Fadib" }],
  generator: "Next.js",
  openGraph: {
    title: "Hambali Fadib — Software Quality Assurance Engineer",
    description:
      "Portfolio Hambali business-critical risk-based and quality-focused work.",
  },
};

export default function HomePage() {
  return <DarkEditorialHero />;
}
