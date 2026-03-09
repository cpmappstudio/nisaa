import {
  TeamSidebar,
  TeamNavbar,
} from "@/components/sections/shell/teams/team-sidebar";
import { SidebarLayout } from "@/components/layouts/sidebar-layout";
import { SportProvider } from "@/lib/sports";
import { getAuthToken } from "@/lib/auth/auth";
import { ensureCurrentUserSynced } from "@/lib/auth/sync-current-user";
import { resolveLeagueSportType } from "@/lib/sports/server";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
};

export default async function TeamLayout({ children, params }: LayoutProps) {
  const { tenant } = await params;
  const token = await getAuthToken();
  await ensureCurrentUserSynced(token);
  const sportType = await resolveLeagueSportType(tenant, token);

  return (
    <SportProvider sportType={sportType}>
      <SidebarLayout
        fullWidth
        navbar={<TeamNavbar />}
        sidebar={<TeamSidebar />}
      >
        <main className="flex-1">{children}</main>
      </SidebarLayout>
    </SportProvider>
  );
}
