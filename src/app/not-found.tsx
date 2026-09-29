import type { Metadata } from "next";
import { NotFoundClient } from "@/components/legal/NotFoundClient";

export const metadata: Metadata = {
  title: {
    absolute: "page not found — form8",
  },
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <NotFoundClient />;
}
