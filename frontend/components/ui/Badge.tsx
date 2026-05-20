import type { PropsWithChildren } from "react";

export function Badge({ children, tone = "default" }: PropsWithChildren<{ tone?: "default" | "festival" }>) {
  return <span className={`badge ${tone === "festival" ? "festival" : ""}`}>{children}</span>;
}
