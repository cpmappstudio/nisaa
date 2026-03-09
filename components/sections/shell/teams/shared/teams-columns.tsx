import { ColumnDef } from "@tanstack/react-table";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import type { FilterConfig } from "@/lib/table/types";
import { Avatar } from "@/components/ui/avatar";

export interface TeamRow {
  _id: string;
  name: string;
  nickname: string;
  logoUrl?: string;
  headCoach: {
    name: string;
  };
  status: "affiliated" | "invited" | "suspended";
}

type Translator = (key: string) => string;

const STATUS_STYLES: Record<TeamRow["status"], string> = {
  affiliated:
    "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  invited: "text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950",
  suspended: "text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
};

export function createTeamColumns(t: Translator): ColumnDef<TeamRow>[] {
  return [
    createSearchColumn<TeamRow>(["name", "nickname"]),

    {
      accessorKey: "name",
      header: createSortableHeader(t("teams.name")),
      cell: ({ row }) => {
        const initials = row.original.name.slice(0, 2).toUpperCase();
        const logoUrl = row.original.logoUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={logoUrl}
              initials={logoUrl ? undefined : initials}
              alt={row.original.name}
              square
              className="size-10"
            />
            <div>
              <span className="font-medium">{row.original.name}</span>
            </div>
          </div>
        );
      },
    },

    {
      accessorKey: "nickname",
      header: createSortableHeader(t("teams.nickname")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.nickname || "—"}
        </span>
      ),
    },

    {
      id: "headCoachName",
      accessorFn: (row) => row.headCoach.name,
      header: createSortableHeader(t("teams.headCoach")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.headCoach.name || "—"}
        </span>
      ),
    },

    {
      accessorKey: "status",
      header: createSortableHeader(t("teams.status")),
      cell: ({ row }) => {
        const status = row.original.status;
        const className = STATUS_STYLES[status];

        return (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${className}`}
          >
            {t(`teams.statusOptions.${status}`)}
          </span>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
  ];
}

export function createTeamFilterConfigs(t: Translator): FilterConfig[] {
  return [
    {
      id: "status",
      label: t("teams.status"),
      options: [
        { value: "affiliated", label: t("teams.statusOptions.affiliated") },
        { value: "invited", label: t("teams.statusOptions.invited") },
        { value: "suspended", label: t("teams.statusOptions.suspended") },
      ],
    },
  ];
}
