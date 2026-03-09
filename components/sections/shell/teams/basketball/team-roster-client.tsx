import { TeamRosterClient as SharedTeamRosterClient } from "@/components/sections/shell/teams/shared/team-roster-client";
import { BasketballPlayerFormDialog } from "@/components/sections/shell/teams/basketball/player-form-dialog";

type SharedTeamRosterClientProps = Parameters<typeof SharedTeamRosterClient>[0];

export function TeamRosterClient(
  props: Omit<SharedTeamRosterClientProps, "PlayerFormDialogComponent">,
) {
  return (
    <SharedTeamRosterClient
      {...props}
      PlayerFormDialogComponent={BasketballPlayerFormDialog}
    />
  );
}
