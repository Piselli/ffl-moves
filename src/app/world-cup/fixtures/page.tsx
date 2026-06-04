import { WcFixturesBoard } from "@/components/wc/WcFixturesBoard";

export const dynamic = "force-dynamic";

export default async function WorldCupFixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round } = await searchParams;
  return <WcFixturesBoard initialRoundKey={round} />;
}
