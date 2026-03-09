import { LeagueRosterClient as SharedLeagueRosterClient } from "@/components/sections/shell/teams/shared/league-roster-client";
import { SoccerPlayerFormDialog } from "@/components/sections/shell/teams/soccer/player-form-dialog";

type SharedLeagueRosterClientProps = Parameters<
  typeof SharedLeagueRosterClient
>[0];

export function LeagueRosterClient(
  props: Omit<SharedLeagueRosterClientProps, "PlayerFormDialogComponent">,
) {
  return (
    <SharedLeagueRosterClient
      {...props}
      PlayerFormDialogComponent={SoccerPlayerFormDialog}
    />
  );
}
