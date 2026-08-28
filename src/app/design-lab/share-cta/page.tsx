import { redirect } from "next/navigation";

/** Placement variants moved to locker preview — one real screen beats wireframes. */
export default function ShareCtaPlacementPage() {
  redirect("/design-lab/locker-hero?preview=registered");
}
