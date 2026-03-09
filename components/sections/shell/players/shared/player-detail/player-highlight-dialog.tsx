"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

interface PlayerHighlightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  playerId: Id<"players">;
  highlight?: {
    id: string;
    title: string;
    url: string;
  } | null;
}

export function PlayerHighlightDialog({
  open,
  onOpenChange,
  playerId,
  highlight,
}: PlayerHighlightDialogProps) {
  const t = useTranslations("Common");
  const addPlayerHighlight = useMutation(api.players.addPlayerHighlight);
  const updatePlayerHighlight = useMutation(api.players.updatePlayerHighlight);
  const removePlayerHighlight = useMutation(api.players.removePlayerHighlight);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isEditMode = Boolean(highlight);

  useEffect(() => {
    if (!open) return;

    setTitle(highlight?.title ?? "");
    setUrl(highlight?.url ?? "");
    setErrorMessage(null);
    setIsSubmitting(false);
    setIsDeleting(false);
  }, [open, highlight]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (highlight) {
        await updatePlayerHighlight({
          playerId,
          highlightId: highlight.id,
          title,
          url,
        });
      } else {
        await addPlayerHighlight({
          playerId,
          title,
          url,
        });
      }
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!highlight) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await removePlayerHighlight({
        playerId,
        highlightId: highlight.id,
      });
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : t("errors.generic"),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>
            {isEditMode ? t("actions.edit") : t("players.addHighlight")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <FieldGroup>
              <Field>
                <FieldLabel>{t("players.highlightName")}</FieldLabel>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("players.highlightNamePlaceholder")}
                  maxLength={120}
                  required
                />
              </Field>
              <Field>
                <FieldLabel>{t("players.highlightUrl")}</FieldLabel>
                <Input
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={t("players.highlightUrlPlaceholder")}
                  required
                />
              </Field>
            </FieldGroup>

            {errorMessage && (
              <p className="mt-4 text-sm text-destructive">{errorMessage}</p>
            )}
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            {isEditMode && (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                onClick={handleDelete}
                disabled={isSubmitting || isDeleting}
              >
                {isDeleting ? t("actions.loading") : t("actions.delete")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting || isDeleting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || isDeleting}>
              {isSubmitting
                ? t("actions.loading")
                : isEditMode
                  ? t("actions.save")
                  : t("actions.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
