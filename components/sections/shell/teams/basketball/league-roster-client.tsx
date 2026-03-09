import { LeagueRosterClient as SharedLeagueRosterClient } from "@/components/sections/shell/teams/shared/league-roster-client";
import { BasketballPlayerFormDialog } from "@/components/sections/shell/teams/basketball/player-form-dialog";

type SharedLeagueRosterClientProps = Parameters<
  typeof SharedLeagueRosterClient
>[0];

export function LeagueRosterClient(
  props: Omit<SharedLeagueRosterClientProps, "PlayerFormDialogComponent">,
) {
  return (
    <SharedLeagueRosterClient
      {...props}
      PlayerFormDialogComponent={BasketballPlayerFormDialog}
    />
  );
}
