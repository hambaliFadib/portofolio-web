import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "About — redirect",
  description:
    "Profile and journey now live on the single-page portfolio at /#about.",
};

export default function AboutPage() {
  redirect("/#about");
}
