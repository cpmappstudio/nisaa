import type { ReactNode } from "react";

export interface SportPageModule {
  renderTeamsPage(args: { tenant: string; token?: string }): Promise<ReactNode>;
  renderLeagueStatsPage(args: {
    tenant: string;
    token?: string;
  }): Promise<ReactNode>;
  renderTeamStatsPage(args: {
    tenant: string;
    teamSlug: string;
    token?: string;
  }): Promise<ReactNode>;
  renderTeamDetailPage(args: {
    tenant: string;
    teamSlug: string;
    token?: string;
    routeScope: "org" | "team";
  }): Promise<ReactNode>;
  renderTeamSettingsPage(args: {
    tenant: string;
    teamSlug: string;
    token?: string;
  }): Promise<ReactNode>;
  renderLeagueRosterPage(args: {
    tenant: string;
    token?: string;
  }): Promise<ReactNode>;
  renderTeamRosterPage(args: {
    tenant: string;
    teamSlug: string;
    token?: string;
  }): Promise<ReactNode>;
  renderPlayerDetailPage(args: {
    tenant: string;
    teamSlug: string;
    playerId: string;
    token?: string;
  }): Promise<ReactNode>;
  renderGameDetailPage(args: {
    tenant: string;
    gameId: string;
    token?: string;
  }): Promise<ReactNode>;
  renderTeamGameDetailPage(args: {
    tenant: string;
    teamSlug: string;
    gameId: string;
    token?: string;
  }): Promise<ReactNode>;
}
