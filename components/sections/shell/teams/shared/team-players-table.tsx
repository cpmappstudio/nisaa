"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "@/i18n/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/data-table";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { ROUTES, TEAM_ROUTES } from "@/lib/navigation/routes";
import { getCountryLabel } from "@/lib/countries/countries";
import { getPlayerFullName, getPlayerInitials } from "@/lib/players/name";
import type {
  PlayerDominantProfile,
  PlayerFormDialogComponent,
  PlayerGender,
} from "./player-form.types";

interface PlayerRow {
  _id: string;
  firstName: string;
  lastName: string;
  secondLastName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  documentNumber?: string | null;
  gender?: PlayerGender | null;
  jerseyNumber?: number | null;
  position?: string | null;
  status: "active" | "inactive";
  height?: number | null;
  weight?: number | null;
  country?: string | null;
  cometNumber?: string | null;
  fifaId?: string | null;
  dominantProfile?: PlayerDominantProfile | null;
  categoryName?: string | null;
  categoryId?: string;
  clubSlug?: string;
  clubName?: string;
  clubNickname?: string | null;
}

interface TeamPlayersTableProps {
  players: PlayerRow[];
  clubSlug?: string;
  orgSlug: string;
  routeScope?: "org" | "team";
  enableCreate?: boolean;
  PlayerFormDialogComponent: PlayerFormDialogComponent;
}

export function TeamPlayersTable({
  players,
  clubSlug,
  orgSlug,
  routeScope = "org",
  enableCreate,
  PlayerFormDialogComponent,
}: TeamPlayersTableProps) {
  const router = useRouter();
  const t = useTranslations("Common");
  const deletePlayer = useMutation(api.players.deletePlayer);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<PlayerRow | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<PlayerRow | null>(null);
  const [dialogClubSlug, setDialogClubSlug] = useState(clubSlug ?? "");
  const [isDeleting, setIsDeleting] = useState(false);

  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  const positions = useMemo(
    () => teamConfig?.positions ?? [],
    [teamConfig?.positions],
  );

  const positionMap = useMemo(() => {
    const map = new Map<string, { name: string; abbreviation: string }>();
    for (const pos of positions) {
      map.set(pos.id, { name: pos.name, abbreviation: pos.abbreviation });
    }
    return map;
  }, [positions]);

  const handleDelete = async () => {
    if (!playerToDelete) return;

    setIsDeleting(true);
    try {
      await deletePlayer({
        playerId: playerToDelete._id as Id<"players">,
      });
      setPlayerToDelete(null);
    } catch (error) {
      console.error("[TeamPlayersTable] Failed to delete player:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<PlayerRow>[] = [
    createSearchColumn<PlayerRow>([
      "firstName",
      "lastName",
      "secondLastName",
      "position",
      "country",
      "clubName",
      "clubNickname",
    ]),

    {
      accessorKey: "firstName",
      header: createSortableHeader(t("players.name")),
      cell: ({ row }) => {
        const fullName = getPlayerFullName(row.original);
        const initials = getPlayerInitials(row.original);
        const photoUrl = row.original.photoUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={photoUrl || undefined}
              initials={photoUrl ? undefined : initials}
              alt={fullName}
              className="size-10"
            />
            <div>
              <span className="font-medium">{fullName}</span>
            </div>
          </div>
        );
      },
    },

    ...(routeScope === "org"
      ? [
          {
            id: "team",
            accessorFn: (row) => row.clubNickname ?? row.clubName ?? "",
            header: createSortableHeader(t("players.team")),
            cell: ({ row }: { row: { original: PlayerRow } }) => (
              <span className="text-sm text-muted-foreground">
                {row.original.clubNickname ?? row.original.clubName ?? "—"}
              </span>
            ),
          } satisfies ColumnDef<PlayerRow>,
        ]
      : []),

    {
      accessorKey: "jerseyNumber",
      header: createSortableHeader("#"),
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {row.original.jerseyNumber ?? "—"}
        </span>
      ),
    },

    {
      accessorKey: "position",
      header: createSortableHeader(t("players.position")),
      cell: ({ row }) => {
        const positionId = row.original.position;
        const positionData = positionId ? positionMap.get(positionId) : null;
        const label = positionData ? positionData.abbreviation : "—";
        return <span className="text-sm text-muted-foreground">{label}</span>;
      },
    },

    {
      accessorKey: "height",
      header: createSortableHeader(t("players.height")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.height ? `${row.original.height} cm` : "—"}
        </span>
      ),
    },

    {
      accessorKey: "weight",
      header: createSortableHeader(t("players.weight")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.weight ? `${row.original.weight} kg` : "—"}
        </span>
      ),
    },

    {
      accessorKey: "categoryName",
      header: createSortableHeader(t("players.category")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.categoryName || t("players.notAssigned")}
        </span>
      ),
    },

    {
      accessorKey: "country",
      header: createSortableHeader(t("players.country")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {getCountryLabel(row.original.country ?? undefined) ?? "—"}
        </span>
      ),
    },

    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  const targetClubSlug = row.original.clubSlug ?? clubSlug;
                  if (!targetClubSlug) {
                    return;
                  }
                  setDialogClubSlug(targetClubSlug);
                  setPlayerToEdit(row.original);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="size-4 mr-2" />
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setPlayerToDelete(row.original)}
              >
                <Trash2 className="size-4 mr-2" />
                {t("actions.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setTimeout(() => setPlayerToEdit(null), 150);
    }
  };

  const handlePlayerRowClick = (player: PlayerRow) => {
    const targetClubSlug = player.clubSlug ?? clubSlug;
    if (!targetClubSlug) {
      return;
    }

    const href =
      routeScope === "org"
        ? ROUTES.org.teams.playerDetail(orgSlug, targetClubSlug, player._id)
        : TEAM_ROUTES.rosterPlayerDetail(orgSlug, targetClubSlug, player._id);
    router.push(href);
  };

  const canCreate = Boolean(enableCreate ?? clubSlug);

  return (
    <>
      <DataTable
        columns={columns}
        data={players}
        filterColumn="search"
        filterPlaceholder={t("players.searchPlaceholder")}
        emptyMessage={t("players.emptyMessage")}
        onRowClick={handlePlayerRowClick}
        onCreate={
          canCreate
            ? () => {
                if (!clubSlug) {
                  return;
                }
                setDialogClubSlug(clubSlug);
                setPlayerToEdit(null);
                setIsDialogOpen(true);
              }
            : undefined
        }
      />

      {dialogClubSlug && (
        <PlayerFormDialogComponent
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          clubSlug={dialogClubSlug}
          positions={positions}
          player={playerToEdit}
        />
      )}

      <AlertDialog
        open={!!playerToDelete}
        onOpenChange={() => setPlayerToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("players.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("players.deleteDescription", {
                name: playerToDelete ? getPlayerFullName(playerToDelete) : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("actions.loading") : t("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
