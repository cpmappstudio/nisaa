import { PlayerDetailClient as SharedPlayerDetailClient } from "@/components/sections/shell/players/shared/player-detail/player-detail-client";
import { SoccerPlayerFormDialog } from "@/components/sections/shell/teams/soccer/player-form-dialog";

type SharedPlayerDetailClientProps = Parameters<typeof SharedPlayerDetailClient>[0];

export function PlayerDetailClient(props: Omit<SharedPlayerDetailClientProps, "PlayerFormDialogComponent">) {
  return (
    <SharedPlayerDetailClient
      {...props}
      PlayerFormDialogComponent={SoccerPlayerFormDialog}
    />
  );
}
