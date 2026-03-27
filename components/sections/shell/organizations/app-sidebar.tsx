"use client";

import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import Image from "next/image";
import { Navbar, NavbarSection, NavbarSpacer } from "@/components/ui/navbar";
import {
  Sidebar,
  SidebarBody,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
  SidebarSpacer,
} from "@/components/ui/sidebar";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { Cog6ToothIcon } from "@heroicons/react/20/solid";
import { getNavConfig, getNavContext, isItemActive } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { ROUTES } from "@/lib/navigation/routes";
import {
  getLocalePrefix,
  getOrgUserProfileUrl,
  getTenantSignInUrl,
  withLocalePrefix,
} from "@/lib/navigation/user-button";
import { isSingleTenantMode } from "@/lib/tenancy/config";

const SINGLE_TENANT_MODE = isSingleTenantMode();

export function NavbarAppSidebar() {
  const params = useParams();
  const locale = useLocale();
  const orgSlug = (params.tenant as string) || null;
  const userProfileUrl = getOrgUserProfileUrl(locale, orgSlug);
  const afterSignOutUrl = getTenantSignInUrl(locale, orgSlug);

  return (
    <Navbar>
      <NavbarSpacer />
      <NavbarSection>
        <UserButton
          userProfileUrl={userProfileUrl}
          afterSignOutUrl={afterSignOutUrl}
        />
      </NavbarSection>
    </Navbar>
  );
}

export function SidebarAppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("Navigation.nav");

  const orgSlug = (params.tenant as string) || null;

  const localePrefix = getLocalePrefix(locale);
  const afterSelectOrgUrl = `${localePrefix}/:slug/teams`;
  const organizationsUrl = withLocalePrefix(locale, ROUTES.auth.organizations);
  const afterSignOutUrl = getTenantSignInUrl(locale, orgSlug);
  const organizationProfileUrl = orgSlug
    ? withLocalePrefix(locale, ROUTES.org.settings.root(orgSlug))
    : organizationsUrl;
  const userProfileUrl = getOrgUserProfileUrl(locale, orgSlug);

  const context = getNavContext(pathname, orgSlug);
  const { items, settingsHref } = getNavConfig(context);

  return (
    <Sidebar>
      <SidebarHeader>
        {SINGLE_TENANT_MODE ? (
          <div className="flex w-full justify-center px-2">
            <Image
              src="/logo_solid.png"
              alt="NISAA"
              width={220}
              height={110}
              className="h-14 w-auto"
              priority
            />
          </div>
        ) : (
          <OrganizationSwitcher
            organizationProfileUrl={organizationProfileUrl}
            afterLeaveOrganizationUrl={organizationsUrl}
            afterSelectOrganizationUrl={afterSelectOrgUrl}
            appearance={{
              elements: {
                rootBox: "w-full",
                organizationSwitcherTrigger: "w-full justify-between text-left",
                organizationPreviewMainIdentifier:
                  "text-sidebar-foreground text-lg font-semibold",
                organizationPreviewSecondaryIdentifier:
                  "text-sidebar-foreground/70",
                organizationSwitcherTriggerIcon: "text-sidebar-foreground",
                organizationSwitcherPopoverCard: "bg-popover",
                organizationSwitcherPopoverActionButton: "hover:bg-accent",
                organizationSwitcherPopoverActionButtonText: "text-foreground",
                avatarBox: "size-12",
                organizationPreviewAvatarBox: "size-12",
              },
            }}
          />
        )}
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {items.map((item) => {
            const href = item.href(orgSlug ?? undefined);
            const isCurrent = isItemActive(pathname, href, item.isIndex);

            return (
              <SidebarItem key={item.labelKey} href={href} current={isCurrent}>
                <item.icon data-slot="icon" />
                <SidebarLabel>{t(item.labelKey)}</SidebarLabel>
              </SidebarItem>
            );
          })}
        </SidebarSection>

        <SidebarSpacer />

        <SidebarSection>
          <SidebarItem
            href={settingsHref(orgSlug ?? undefined)}
            current={isItemActive(
              pathname,
              settingsHref(orgSlug ?? undefined),
              false,
            )}
          >
            <Cog6ToothIcon data-slot="icon" />
            <SidebarLabel>{t("settings")}</SidebarLabel>
          </SidebarItem>
        </SidebarSection>
      </SidebarBody>

      <SidebarFooter className="max-lg:hidden">
        <UserButton
          userProfileUrl={userProfileUrl}
          afterSignOutUrl={afterSignOutUrl}
          appearance={{
            elements: {
              userButtonBox: {
                flexDirection: "row-reverse",
                textAlign: "left",
                maxWidth: "100%",
              },
              userButtonOuterIdentifier: "text-sidebar-foreground",
              userButtonTrigger: "text-sidebar-foreground",
            },
          }}
          showName
        />
      </SidebarFooter>
    </Sidebar>
  );
}
