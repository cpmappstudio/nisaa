import {
  BuildingLibraryIcon,
  ChartBarIcon,
  UsersIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  ShieldCheckIcon,
  CalendarIcon,
  UserGroupIcon,
  RectangleStackIcon,
} from "@heroicons/react/20/solid";
import { Palette } from "lucide-react";
import { ROUTES, TEAM_ROUTES } from "@/lib/navigation/routes";
import type {
  NavItem,
  NavConfig,
  NavContext,
  NavIcon,
  SettingsNavItem,
  SettingsNavConfig,
  TeamNavItem,
  TeamNavConfig,
} from "./types";

/**
 * Valid labelKey values for settings navigation items.
 * Used by the settings search to look up icons.
 */
export type SettingsLabelKey =
  | "general"
  | "teamConfig"
  | "appearance"
  | "profileSecurity"
  | "billing";

// =============================================================================
// Main Navigation Configuration
// =============================================================================

const ADMIN_ITEMS: NavItem[] = [
  {
    labelKey: "organizations",
    icon: BuildingLibraryIcon,
    href: () => ROUTES.admin.organizations.list,
    isIndex: false,
  },
];

const ORG_ITEMS: NavItem[] = [
  {
    labelKey: "teams",
    icon: UserGroupIcon,
    href: (orgSlug) => ROUTES.org.teams.list(orgSlug!),
    isIndex: false,
  },
  {
    labelKey: "roster",
    icon: UsersIcon,
    href: (orgSlug) => ROUTES.org.roster.list(orgSlug!),
    isIndex: false,
  },
  {
    labelKey: "games",
    icon: CalendarIcon,
    href: (orgSlug) => ROUTES.org.games.list(orgSlug!),
    isIndex: false,
  },
  {
    labelKey: "stats",
    icon: ChartBarIcon,
    href: (orgSlug) => ROUTES.org.stats.list(orgSlug!),
    isIndex: false,
  },
  //
  // {
  //   labelKey: "divisions",
  //   icon: TrophyIcon,
  //   href: (orgSlug) => ROUTES.org.divisions.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "tournaments",
  //   icon: CalendarIcon,
  //   href: (orgSlug) => ROUTES.org.tournaments.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "offerings",
  //   icon: DocumentTextIcon,
  //   href: (orgSlug) => ROUTES.org.offerings.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "applications",
  //   icon: ClipboardDocumentListIcon,
  //   href: (orgSlug) => ROUTES.org.applications.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "members",
  //   icon: UserGroupIcon,
  //   href: (orgSlug) => ROUTES.org.members.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "fees",
  //   icon: CurrencyDollarIcon,
  //   href: (orgSlug) => ROUTES.org.fees.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "forms",
  //   icon: DocumentDuplicateIcon,
  //   href: (orgSlug) => ROUTES.org.forms.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "staff",
  //   icon: UsersIcon,
  //   href: (orgSlug) => ROUTES.org.staff.list(orgSlug!),
  //   isIndex: false,
  // },
  // {
  //   labelKey: "payments",
  //   icon: CreditCardIcon,
  //   href: (orgSlug) => ROUTES.org.payments(orgSlug!),
  //   isIndex: false,
  // },
];

// =============================================================================
// Team Navigation Configuration
// =============================================================================

const TEAM_ITEMS: TeamNavItem[] = [
  {
    labelKey: "roster",
    icon: UserGroupIcon,
    href: (orgSlug, teamSlug) => TEAM_ROUTES.roster(orgSlug, teamSlug),
    isIndex: false,
  },
  {
    labelKey: "staff",
    icon: UsersIcon,
    href: (orgSlug, teamSlug) => TEAM_ROUTES.staff(orgSlug, teamSlug),
    isIndex: false,
  },
  {
    labelKey: "games",
    icon: CalendarIcon,
    href: (orgSlug, teamSlug) => TEAM_ROUTES.games.list(orgSlug, teamSlug),
    isIndex: false,
  },
  {
    labelKey: "stats",
    icon: ChartBarIcon,
    href: (orgSlug, teamSlug) => TEAM_ROUTES.stats.list(orgSlug, teamSlug),
    isIndex: false,
  },
];

const TEAM_NAV_CONFIG: TeamNavConfig = {
  items: TEAM_ITEMS,
  settingsHref: (orgSlug, teamSlug) =>
    TEAM_ROUTES.settings.root(orgSlug, teamSlug),
};

const NAV_CONFIGS: Record<Exclude<NavContext, "team">, NavConfig> = {
  admin: {
    items: ADMIN_ITEMS,
    settingsHref: () => ROUTES.admin.settings.root,
  },
  org: {
    items: ORG_ITEMS,
    settingsHref: (orgSlug) => ROUTES.org.settings.root(orgSlug!),
  },
};

// =============================================================================
// Settings Navigation Configuration
// =============================================================================

const ADMIN_SETTINGS_ITEMS: SettingsNavItem[] = [
  {
    labelKey: "general",
    icon: Cog6ToothIcon,
    href: () => ROUTES.admin.settings.root,
    isIndex: true,
  },
  {
    labelKey: "teamConfig",
    icon: RectangleStackIcon,
    href: () => ROUTES.admin.settings.teamConfig,
    isIndex: false,
  },
  {
    labelKey: "profileSecurity",
    icon: ShieldCheckIcon,
    href: () => ROUTES.admin.settings.profileSecurity,
    isIndex: false,
  },
  // {
  //   labelKey: "billing",
  //   icon: CreditCardIcon,
  //   href: () => ROUTES.admin.settings.billing,
  //   isIndex: false,
  // },
  {
    labelKey: "appearance",
    icon: Palette,
    href: () => ROUTES.admin.settings.appearance,
    isIndex: false,
  },
];

const ORG_SETTINGS_ITEMS: SettingsNavItem[] = [
  {
    labelKey: "general",
    icon: Cog6ToothIcon,
    href: (orgSlug) => ROUTES.org.settings.root(orgSlug!),
    isIndex: true,
  },
  {
    labelKey: "teamConfig",
    icon: RectangleStackIcon,
    href: (orgSlug) => ROUTES.org.settings.teamConfig(orgSlug!),
    isIndex: false,
  },
  {
    labelKey: "profileSecurity",
    icon: ShieldCheckIcon,
    href: (orgSlug) => ROUTES.org.settings.profileSecurity(orgSlug!),
    isIndex: false,
  },
  // {
  //   labelKey: "billing",
  //   icon: CreditCardIcon,
  //   href: (orgSlug) => ROUTES.org.settings.billing(orgSlug!),
  //   isIndex: false,
  // },
  {
    labelKey: "appearance",
    icon: Palette,
    href: (orgSlug) => ROUTES.org.settings.appearance(orgSlug!),
    isIndex: false,
  },
];

const TEAM_SETTINGS_ITEMS: SettingsNavItem[] = [
  {
    labelKey: "general",
    icon: Cog6ToothIcon,
    href: (orgSlug, teamSlug) => TEAM_ROUTES.settings.root(orgSlug!, teamSlug!),
    isIndex: true,
  },
  {
    labelKey: "profileSecurity",
    icon: ShieldCheckIcon,
    href: (orgSlug, teamSlug) =>
      TEAM_ROUTES.settings.profileSecurity(orgSlug!, teamSlug!),
    isIndex: false,
  },
  {
    labelKey: "appearance",
    icon: Palette,
    href: (orgSlug, teamSlug) =>
      TEAM_ROUTES.settings.appearance(orgSlug!, teamSlug!),
    isIndex: false,
  },
];

const SETTINGS_NAV_CONFIGS: Record<NavContext, SettingsNavConfig> = {
  admin: {
    items: ADMIN_SETTINGS_ITEMS,
    basePath: () => ROUTES.admin.settings.root,
  },
  org: {
    items: ORG_SETTINGS_ITEMS,
    basePath: (orgSlug) => ROUTES.org.settings.root(orgSlug!),
  },
  team: {
    items: TEAM_SETTINGS_ITEMS,
    basePath: (orgSlug, teamSlug) =>
      TEAM_ROUTES.settings.root(orgSlug!, teamSlug!),
  },
};

const SETTINGS_ICON_BY_LABEL: Record<SettingsLabelKey, NavIcon> = {
  general: Cog6ToothIcon,
  teamConfig: RectangleStackIcon,
  appearance: Palette,
  profileSecurity: ShieldCheckIcon,
  billing: CreditCardIcon,
};

// =============================================================================
// Exported Functions
// =============================================================================

export function getNavConfig(context: Exclude<NavContext, "team">): NavConfig {
  return NAV_CONFIGS[context];
}

export function getTeamNavConfig(): TeamNavConfig {
  return TEAM_NAV_CONFIG;
}

export function getSettingsNavConfig(context: NavContext): SettingsNavConfig {
  return SETTINGS_NAV_CONFIGS[context];
}

export function isItemActive(
  pathname: string,
  href: string,
  isIndex: boolean = false,
): boolean {
  if (isIndex) {
    return pathname === href || pathname === `${href}/`;
  }
  return pathname.startsWith(href);
}

export function getNavContext(
  pathname: string,
  orgSlug: string | null,
): Exclude<NavContext, "team"> {
  if (pathname.startsWith("/admin")) {
    return "admin";
  }
  if (orgSlug) {
    return "org";
  }
  return "admin";
}

/**
 * Get the icon component for a settings item by its labelKey.
 * Uses a stable map so search stays safe even if an item is hidden from navigation.
 */
export function getSettingsIcon(labelKey: SettingsLabelKey): NavIcon {
  return SETTINGS_ICON_BY_LABEL[labelKey];
}
