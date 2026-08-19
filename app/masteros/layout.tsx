import type { Metadata } from "next";
import { MasterOSShell } from "./components/Shell";
import "./masteros.css";

export const metadata: Metadata = {
  title: "MasterOS — Personal teaching OS",
  description: "Teach any subject with a reusable lesson → practice → mastery loop.",
};

export default function MasterOSLayout({ children }: { children: React.ReactNode }) {
  return <MasterOSShell>{children}</MasterOSShell>;
}
