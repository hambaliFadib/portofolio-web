import type { Metadata } from "next";
import { QualityThinkingPageContent } from "@/components/portfolio/quality-thinking-page-content";

export const metadata: Metadata = {
  title: "QA Thinking System",
  description:
    "How quality decisions are made under ambiguity, risk, and real business impact.",
};

export default function QualityThinkingPage() {
  return <QualityThinkingPageContent />;
}
