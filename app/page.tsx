import type { Metadata } from "next";
import { LabApp } from "@/src/ui/LabApp";

export const metadata: Metadata = {
  title: { absolute: "RubriLab — Practical classroom evidence" },
  description: "Offline laboratory session management and assessment for secondary-school practical teaching.",
};

export default function Home() {
  return <LabApp />;
}
