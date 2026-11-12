import type { Metadata } from "next";
import { headers } from "next/headers";
import { PersonaHomepage } from "@/features/home";

const personaTitles = {
  qa: "Hambali Fadib — Software Quality Assurance Engineer",
  fullstack: "Hambali Fadib — Full Stack Engineer",
} as const;

/**
 * Single-page portfolio with request-initialized persona and appearance.
 * Portfolio content remains local; no CMS or content API is required.
 */
export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const persona = requestHeaders.get("x-portfolio-persona") === "fullstack" ? "fullstack" : "qa";
  const title = personaTitles[persona];
  const description = "Portfolio Hambali business-critical risk-based and quality-focused work.";

  return {
    title: { absolute: title },
    description,
    keywords: ["QA", "Software Quality", "Portfolio", "Risk"],
    authors: [{ name: "Hambali Fadib" }],
    generator: "Next.js",
    openGraph: { title, description },
  };
}

export default function HomePage() {
  return <PersonaHomepage personaTitles={personaTitles} />;
}
