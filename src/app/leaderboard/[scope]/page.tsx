import Home from "../../page";

const leaderboardScopeBySlug = {
  us: "US",
  local: "Local",
  friends: "Friends",
} as const;

type LeaderboardScopeSlug = keyof typeof leaderboardScopeBySlug;

export default async function LeaderboardScopePage({
  params,
}: {
  params: Promise<{ scope: string }>;
}) {
  const { scope } = await params;
  const leaderboardScope =
    leaderboardScopeBySlug[scope as LeaderboardScopeSlug] ?? "Global";

  return (
    <Home
      initialHomeView="leaderboard"
      initialLeaderboardScope={leaderboardScope}
    />
  );
}
