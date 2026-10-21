import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "QA Thinking — redirect",
  description:
    "The thinking map now lives on the single-page portfolio at /#thinking.",
};

export default function QualityThinkingPage() {
  redirect("/#thinking");
}
