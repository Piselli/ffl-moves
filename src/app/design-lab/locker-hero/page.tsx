"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LockerHero } from "@/components/design-lab/locker-hero/LockerHero";

function LockerHeroLabInner() {
  const searchParams = useSearchParams();
  const previewRegistered = searchParams.get("preview") === "registered";

  return <LockerHero previewRegistered={previewRegistered} />;
}

export default function LockerHeroPage() {
  return (
    <Suspense fallback={<LockerHero />}>
      <LockerHeroLabInner />
    </Suspense>
  );
}
