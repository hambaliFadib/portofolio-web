import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Contact — redirect",
  description:
    "Contact channels now live on the single-page portfolio at /#contact.",
};

export default function ContactPage() {
  redirect("/#contact");
}
