import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Projects — redirect",
  description:
    "Selected work now lives on the single-page portfolio at /#projects.",
};

export default function ProjectsPage() {
  redirect("/#projects");
}
