import { notFound } from "next/navigation";

export const metadata = {
  robots: { index: false, follow: false },
};

/** Hit only via middleware rewrite from /world-cup — surfaces the real 404 page. */
export default function WorldCupGone() {
  notFound();
}
