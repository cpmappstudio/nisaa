"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/data-table";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import { Avatar } from "@/components/ui/avatar";
import { isEnabledStaffRole, type EnabledStaffRole } from "@/lib/staff/roles";

interface StaffRow {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  categoryName?: string;
}

interface TeamStaffListProps {
  clubSlug: string;
}

const ROLE_STYLES: Record<EnabledStaffRole, string> = {
  head_coach:
    "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
};

export function TeamStaffList({ clubSlug }: TeamStaffListProps) {
  const t = useTranslations("Common");
  const staffData = useQuery(api.staff.listAllByClubSlug, { clubSlug });

  const staffMembers = (staffData?.staff ?? []).filter((member) =>
    isEnabledStaffRole(member.role),
  );

  const columns: ColumnDef<StaffRow>[] = [
    createSearchColumn<StaffRow>(["fullName", "email", "role"]),

    {
      accessorKey: "fullName",
      header: createSortableHeader(t("staff.name")),
      cell: ({ row }) => {
        const initials = row.original.fullName.slice(0, 2).toUpperCase();
        const avatarUrl = row.original.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl}
              initials={avatarUrl ? undefined : initials}
              alt={row.original.fullName}
              className="size-10"
            />
            <div>
              <span className="font-medium">{row.original.fullName}</span>
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "email",
      header: createSortableHeader(t("staff.email")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },

    {
      accessorKey: "role",
      header: createSortableHeader(t("staff.role")),
      cell: ({ row }) => {
        const role = row.original.role;
        if (!isEnabledStaffRole(role)) {
          return null;
        }
        const className = ROLE_STYLES[role];

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {t(`staffRole.${role}`)}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={staffMembers}
      filterColumn="search"
      filterPlaceholder={t("staff.searchPlaceholder")}
      emptyMessage={t("staff.emptyMessage")}
    />
  );
}
