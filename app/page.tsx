import type { Metadata } from "next";
import { PersonaHomepage } from "@/features/home";

/**
 * Single-page portfolio with request-initialized persona and appearance.
 * Portfolio content remains local; no CMS or content API is required.
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
  return <PersonaHomepage />;
}
