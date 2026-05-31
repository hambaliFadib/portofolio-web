import type { Metadata } from "next";
import { ProjectsPageContent } from "@/components/portfolio/projects-page-content";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Enterprise case studies, built QA systems, and a QA decision framework structured for risk-aware evaluation.",
};

export default function ProjectsPage() {
  return <ProjectsPageContent />;
}
