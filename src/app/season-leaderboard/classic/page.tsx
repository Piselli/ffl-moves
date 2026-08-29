import { redirect } from "next/navigation";

/** Classic view retired — dense table is now the shipping standings. */
export default function SeasonLeaderboardClassicPage() {
  redirect("/season-leaderboard");
}
