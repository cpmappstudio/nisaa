"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlayerFormDialogFields } from "./player-form-dialog-fields";
import { usePlayerFormDialogController } from "./use-player-form-dialog-controller";
import type { PlayerFormDialogProps } from "./player-form-dialog.types";

export function PlayerFormDialog({
  open,
  onOpenChange,
  clubSlug,
  ageCategories,
  enabledGenders,
  horizontalDivisions,
  positions,
  player,
}: PlayerFormDialogProps) {
  const t = useTranslations("Common");
  const controller = usePlayerFormDialogController({
    ageCategories,
    clubSlug,
    enabledGenders,
    horizontalDivisions,
    onOpenChange,
    open,
    player,
  });

  return (
    <Dialog open={open} onOpenChange={controller.handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>
            {controller.isEditMode ? t("players.edit") : t("players.create")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={controller.handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <PlayerFormDialogFields
              ageCategories={controller.ageCategories}
              enabledGenders={controller.enabledGenders}
              horizontalDivisions={controller.horizontalDivisions}
              onDateOfBirthChange={controller.handleDateOfBirthChange}
              onFileChange={controller.handleFileChange}
              onLeagueCategoryChange={controller.handleLeagueCategoryChange}
              positions={positions}
              setField={controller.setField}
              values={controller.values}
            />
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => controller.handleOpenChange(false)}
              disabled={controller.isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={controller.isSubmitting || !controller.isFormValid}
            >
              {controller.isSubmitting
                ? t("actions.loading")
                : controller.isEditMode
                  ? t("actions.save")
                  : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
