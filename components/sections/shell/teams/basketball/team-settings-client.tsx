import { TeamSettingsClient as SharedTeamSettingsClient } from "@/components/sections/shell/teams/shared/team-settings-client";
import { BasketballPlayerFormDialog } from "@/components/sections/shell/teams/basketball/player-form-dialog";

type SharedTeamSettingsClientProps = Parameters<
  typeof SharedTeamSettingsClient
>[0];

export function TeamSettingsClient(
  props: Omit<SharedTeamSettingsClientProps, "PlayerFormDialogComponent">,
) {
  return (
    <SharedTeamSettingsClient
      {...props}
      PlayerFormDialogComponent={BasketballPlayerFormDialog}
    />
  );
}
