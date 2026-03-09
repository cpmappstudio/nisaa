import { PlayerDemoPage } from "@/components/sections/shell/players/basketball/player-detail/player-demo-page";

interface PlayerDemoRoutePageProps {
  params: Promise<{
    tenant: string;
  }>;
}

export default async function PlayerDemoRoutePage({
  params,
}: PlayerDemoRoutePageProps) {
  const { tenant } = await params;

  return <PlayerDemoPage orgSlug={tenant} />;
}
