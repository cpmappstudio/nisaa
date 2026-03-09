"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldLabel } from "@/components/ui/field";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  ENABLED_STAFF_ROLES,
  isEnabledStaffRole,
  type EnabledStaffRole,
} from "@/lib/staff/roles";

const ROLE_OPTIONS: {
  value: EnabledStaffRole;
  labelKey: `staffRole.${EnabledStaffRole}`;
}[] = ENABLED_STAFF_ROLES.map((value) => ({
  value,
  labelKey: `staffRole.${value}` as const,
}));

interface StaffRow {
  _id: string;
  userId: Id<"users">;
  fullName: string;
  email: string;
  avatarUrl?: string;
  role: string;
  categoryName?: string;
}

interface TeamStaffTableProps {
  clubSlug: string;
  orgSlug: string;
}

const ROLE_STYLES: Record<EnabledStaffRole, string> = {
  head_coach:
    "text-purple-700 bg-purple-50 dark:text-purple-400 dark:bg-purple-950",
};

export function TeamStaffTable({ clubSlug, orgSlug }: TeamStaffTableProps) {
  const t = useTranslations("Common");
  const locale = useLocale();
  const staffData = useQuery(api.staff.listAllByClubSlug, { clubSlug });
  const clubData = useQuery(api.clubs.getBySlug, { slug: clubSlug });
  const currentUser = useQuery(api.users.me);
  const removeStaff = useMutation(api.staff.removeStaff);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<EnabledStaffRole>("head_coach");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const staffMembers = (staffData?.staff ?? []).filter((member) =>
    isEnabledStaffRole(member.role),
  );
  const currentUserId = currentUser?._id;
  const currentOrgRole = currentUser?.memberships.find(
    (membership) => membership.organizationSlug === orgSlug,
  )?.role;
  const isCurrentUserOrgAdmin =
    currentUser?.isSuperAdmin ||
    currentOrgRole === "admin" ||
    currentOrgRole === "superadmin";
  const currentUserStaffRole = currentUserId
    ? (() => {
        const role = staffMembers.find(
          (staff) => staff.userId === currentUserId,
        )?.role;
        return isEnabledStaffRole(role) ? role : undefined;
      })()
    : undefined;

  const canDeleteStaffMember = (member: StaffRow): boolean => {
    if (!currentUserId) {
      return false;
    }

    if (member.userId === currentUserId) {
      return false;
    }

    if (isCurrentUserOrgAdmin) {
      return true;
    }

    if (currentUserStaffRole !== "head_coach") {
      return false;
    }

    return member.role !== "head_coach";
  };

  const resetForm = () => {
    setEmail("");
    setRole("head_coach");
  };

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!email.trim() || !clubData?._id) return;

    setIsSubmitting(true);

    try {
      // Call our API route to create Clerk organization invitation with staff metadata
      const response = await fetch("/api/staff/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          emailAddress: email.trim(),
          staffRole: role,
          clubId: clubData._id,
          locale,
          tenant: orgSlug,
        }),
      });

      // Handle response - check for errors first
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error("Failed to parse server response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      toast.success(t("staff.invitationSent"));
      resetForm();
      setIsCreateOpen(false);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to invite staff:", error);
      toast.error(
        error instanceof Error ? error.message : t("staff.invitationFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!staffToDelete) return;

    setIsDeleting(true);
    try {
      await removeStaff({
        staffId: staffToDelete._id as Id<"staff">,
      });
      toast.success(t("staff.deleted"));
      setStaffToDelete(null);
    } catch (error) {
      console.error("[TeamStaffTable] Failed to delete staff member:", error);
      toast.error(t("staff.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<StaffRow>[] = [
    createSearchColumn<StaffRow>(["fullName", "email", "role"]),

    {
      accessorKey: "fullName",
      header: createSortableHeader(t("staff.name")),
      cell: ({ row }) => {
        const fullName = row.original.fullName || row.original.email;
        const initials = fullName.slice(0, 2).toUpperCase();
        const avatarUrl = row.original.avatarUrl;

        return (
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl}
              initials={avatarUrl ? undefined : initials}
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

    {
      id: "actions",
      cell: ({ row }) => {
        const canDelete = canDeleteStaffMember(row.original);

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive"
                disabled={!canDelete}
                onClick={() => {
                  if (!canDelete) {
                    return;
                  }
                  setStaffToDelete(row.original);
                }}
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

  return (
    <>
      <DataTable
        columns={columns}
        data={staffMembers}
        filterColumn="search"
        filterPlaceholder={t("staff.searchPlaceholder")}
        emptyMessage={t("staff.emptyMessage")}
        onCreate={() => setIsCreateOpen(true)}
      />

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t("staff.invite")}</DialogTitle>
            <DialogDescription>
              {t("staff.inviteDescription")}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-6 mt-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <FieldLabel>{t("form.email")}</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="email@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <FieldLabel className="invisible">Role</FieldLabel>

                <Select
                  value={role}
                  onValueChange={(value) => {
                    if (isEnabledStaffRole(value)) {
                      setRole(value);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] mt-2">
                    <SelectValue placeholder={t("staff.selectRole")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {t(option.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting || !email.trim()}>
                {isSubmitting ? t("actions.loading") : t("staff.sendInvite")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!staffToDelete}
        onOpenChange={() => setStaffToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("staff.deleteDescription", {
                name: staffToDelete?.fullName ?? staffToDelete?.email ?? "",
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
