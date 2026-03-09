import {
  SidebarAppSidebar,
  NavbarAppSidebar,
} from "@/components/sections/shell/organizations/app-sidebar";
import { CoachTeamResolver } from "@/components/sections/shell/organizations/coach-team-resolver";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { OrgMismatchError } from "@/components/sections/shell/organizations/org-mismatch-error";
import { SportProvider } from "@/components/providers/sport-provider";
import { getTenantAccess } from "@/lib/auth/tenant-access";
import { getPrimaryTeamSlug } from "@/lib/auth/team-access";
import { TEAM_ROUTES } from "@/lib/navigation/routes";
import { getAuthToken } from "@/lib/auth/auth";
import { ensureCurrentUserSynced } from "@/lib/auth/sync-current-user";
import { resolveLeagueSportType } from "@/lib/sports/server";
import { routing } from "@/i18n/routing";
import { redirect } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string; tenant: string }>;
}

export default async function OrgLayout({ children, params }: LayoutProps) {
  const { locale, tenant } = await params;
  const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  const token = await getAuthToken();
  await ensureCurrentUserSynced(token);
  const { hasAccess, role } = await getTenantAccess(tenant, token);

  if (!hasAccess) {
    return <OrgMismatchError urlSlug={tenant} />;
  }

  if (role === "coach") {
    const coachTeamSlug = await getPrimaryTeamSlug(tenant);

    if (coachTeamSlug) {
      redirect(`${localePrefix}${TEAM_ROUTES.roster(tenant, coachTeamSlug)}`);
    }

    return <CoachTeamResolver organizationSlug={tenant} />;
  }

  const sportType = await resolveLeagueSportType(tenant, token);

  return (
    <SportProvider sportType={sportType}>
      <SidebarLayout
        fullWidth
        navbar={<NavbarAppSidebar />}
        sidebar={<SidebarAppSidebar />}
      >
        <main className="flex-1">{children}</main>
      </SidebarLayout>
    </SportProvider>
  );
}
