"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createCroppedImageFile } from "@/lib/files/image-crop";
import { cn } from "@/lib/utils";

interface ImageCropDialogProps {
  open: boolean;
  src: string | null;
  fileName: string;
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  cropShape?: "rect" | "round";
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export function ImageCropDialog({
  open,
  src,
  fileName,
  aspect,
  outputWidth,
  outputHeight,
  cropShape = "rect",
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const t = useTranslations("Common");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropping(false);
  }, [open, src]);

  const handleConfirm = async () => {
    if (!src || !croppedAreaPixels) {
      return;
    }

    setIsCropping(true);

    try {
      const croppedFile = await createCroppedImageFile({
        src,
        crop: croppedAreaPixels,
        fileName,
        outputWidth,
        outputHeight,
      });
      onConfirm(croppedFile);
    } catch (error) {
      console.error("[ImageCropDialog] Failed to crop image:", error);
      toast.error(t("imageCropper.errors.cropFailed"));
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isCropping) {
          onCancel();
        }
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          onEscapeKeyDown={(event) => {
            if (isCropping) {
              event.preventDefault();
            }
          }}
          onPointerDownOutside={(event) => {
            if (isCropping) {
              event.preventDefault();
            }
          }}
          className={cn(
            "fixed top-[50%] left-[50%] z-[80] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-0 shadow-lg outline-none",
          )}
        >
          <div className="border-b px-4 py-3 sm:px-6 sm:py-4">
            <DialogTitle>{t("imageCropper.title")}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("imageCropper.description")}
            </p>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="relative h-[320px] overflow-hidden rounded-lg bg-black sm:h-[420px]">
              {src ? (
                <Cropper
                  image={src}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect}
                  cropShape={cropShape}
                  showGrid={false}
                  disableAutomaticStylesInjection
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedPixels) =>
                    setCroppedAreaPixels(croppedPixels)
                  }
                />
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{t("imageCropper.zoom")}</span>
                <span className="text-muted-foreground">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isCropping}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!src || !croppedAreaPixels || isCropping}
            >
              {isCropping ? t("actions.loading") : t("imageCropper.confirm")}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
