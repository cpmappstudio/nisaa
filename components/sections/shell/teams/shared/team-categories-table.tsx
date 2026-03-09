"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/table/data-table";
import {
  createSearchColumn,
  createSortableHeader,
} from "@/components/table/column-helpers";
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
import { MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { CategoryFormDialog } from "./category-form-dialog";

interface CategoryRow {
  _id: string;
  name: string;
  ageGroup: string;
  gender: "male" | "female" | "mixed";
  status: "active" | "inactive";
  playerCount: number;
}

interface TeamCategoriesTableProps {
  categories: CategoryRow[];
  clubSlug: string;
  orgSlug: string;
}

const STATUS_STYLES: Record<CategoryRow["status"], string> = {
  active: "text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950",
  inactive: "text-gray-700 bg-gray-50 dark:text-gray-400 dark:bg-gray-950",
};

const GENDER_ICONS: Record<CategoryRow["gender"], string> = {
  male: "♂",
  female: "♀",
  mixed: "⚥",
};

export function TeamCategoriesTable({
  categories,
  clubSlug,
  orgSlug,
}: TeamCategoriesTableProps) {
  const t = useTranslations("Common");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryRow | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCategory = useMutation(api.categories.remove);

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    setIsDeleting(true);
    try {
      await deleteCategory({
        categoryId: categoryToDelete._id as Id<"categories">,
      });
      setCategoryToDelete(null);
    } catch (error) {
      console.error("[TeamCategoriesTable] Failed to delete category:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<CategoryRow>[] = [
    createSearchColumn<CategoryRow>(["name", "ageGroup"]),

    {
      accessorKey: "name",
      header: createSortableHeader(t("categories.name")),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.name}</span>
          </div>
        );
      },
    },

    {
      accessorKey: "ageGroup",
      header: createSortableHeader(t("categories.ageGroup")),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.ageGroup}
        </span>
      ),
    },

    {
      accessorKey: "gender",
      header: createSortableHeader(t("categories.gender")),
      cell: ({ row }) => {
        const gender = row.original.gender;
        const icon = GENDER_ICONS[gender];

        return (
          <div className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <span className="text-sm text-muted-foreground">
              {t(`categories.genderOptions.${gender}`)}
            </span>
          </div>
        );
      },
    },

    {
      accessorKey: "playerCount",
      header: createSortableHeader(t("categories.playerCount")),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {row.original.playerCount}
          </span>
        </div>
      ),
    },

    {
      accessorKey: "status",
      header: createSortableHeader(t("categories.status")),
      cell: ({ row }) => {
        const status = row.original.status;
        const className = STATUS_STYLES[status];

        return (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
          >
            {t(`categories.statusOptions.${status}`)}
          </span>
        );
      },
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
                  setCategoryToEdit(row.original);
                  setIsDialogOpen(true);
                }}
              >
                <Pencil className="size-4 mr-2" />
                {t("actions.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setCategoryToDelete(row.original)}
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
      setTimeout(() => setCategoryToEdit(null), 150);
    }
  };

  return (
    <>
      <DataTable
        columns={columns}
        data={categories}
        filterColumn="search"
        filterPlaceholder={t("categories.searchPlaceholder")}
        emptyMessage={t("categories.emptyMessage")}
        onCreate={() => {
          setCategoryToEdit(null);
          setIsDialogOpen(true);
        }}
      />

      <CategoryFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        clubSlug={clubSlug}
        orgSlug={orgSlug}
        category={categoryToEdit}
      />

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={() => setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("categories.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("categories.deleteDescription", {
                name: categoryToDelete?.name ?? "",
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
