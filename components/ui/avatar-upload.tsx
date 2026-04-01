"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { User, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { formatBytes, type FileWithPreview } from "@/lib/files/upload";

interface AvatarCropOptions {
  aspect: number;
  outputWidth: number;
  outputHeight: number;
  cropShape?: "rect" | "round";
}

interface AvatarUploadProps {
  maxSize?: number;
  className?: string;
  onFileChange?: (file: FileWithPreview | null) => void;
  defaultAvatar?: string;
  cropOptions?: AvatarCropOptions;
}

export default function AvatarUpload({
  maxSize = 2 * 1024 * 1024, // 2MB
  className,
  onFileChange,
  defaultAvatar,
  cropOptions,
}: AvatarUploadProps) {
  const t = useTranslations("Common");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<FileWithPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingCrop, setPendingCrop] = useState<{
    file: File;
    src: string;
  } | null>(null);

  const previewUrl = file?.preview || defaultAvatar;

  const revokePreview = useCallback((preview?: string) => {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  }, []);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    return () => {
      revokePreview(file?.preview);
      revokePreview(pendingCrop?.src);
    };
  }, [file?.preview, pendingCrop?.src, revokePreview]);

  const buildFileWithPreview = useCallback(
    (nextFile: File): FileWithPreview => {
      const preview = URL.createObjectURL(nextFile);
      return {
        file: nextFile,
        id: `${nextFile.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        preview,
      };
    },
    [],
  );

  const validateImageType = useCallback(
    (nextFile: File) => {
      if (!nextFile.type.startsWith("image/")) {
        return t("imageCropper.errors.invalidType");
      }

      return null;
    },
    [t],
  );

  const validateFinalImageFile = useCallback(
    (nextFile: File) => {
      if (nextFile.size > maxSize) {
        return t("imageCropper.errors.tooLarge", {
          fileName: nextFile.name,
          size: formatBytes(maxSize),
        });
      }

      return null;
    },
    [maxSize, t],
  );

  const commitFile = useCallback(
    (nextFile: File) => {
      setFile((current) => {
        revokePreview(current?.preview);
        return buildFileWithPreview(nextFile);
      });
    },
    [buildFileWithPreview, revokePreview],
  );

  useEffect(() => {
    onFileChange?.(file);
  }, [file, onFileChange]);

  const processSelectedFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) {
        return;
      }

      const typeValidationError = validateImageType(nextFile);
      if (typeValidationError) {
        toast.error(typeValidationError);
        resetInput();
        return;
      }

      if (cropOptions) {
        setPendingCrop((current) => {
          revokePreview(current?.src);
          return {
            file: nextFile,
            src: URL.createObjectURL(nextFile),
          };
        });
        return;
      }

      const finalValidationError = validateFinalImageFile(nextFile);
      if (finalValidationError) {
        toast.error(finalValidationError);
        resetInput();
        return;
      }

      commitFile(nextFile);
      resetInput();
    },
    [
      commitFile,
      cropOptions,
      resetInput,
      revokePreview,
      validateFinalImageFile,
      validateImageType,
    ],
  );

  const openFileDialog = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      processSelectedFile(event.target.files?.[0] ?? null);
    },
    [processSelectedFile],
  );

  const handleDragEnter = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);
      processSelectedFile(event.dataTransfer.files?.[0] ?? null);
    },
    [processSelectedFile],
  );

  const handleRemove = useCallback(() => {
    setFile((current) => {
      revokePreview(current?.preview);
      return null;
    });
    resetInput();
  }, [resetInput, revokePreview]);

  const handleCropCancel = useCallback(() => {
    setPendingCrop((current) => {
      revokePreview(current?.src);
      return null;
    });
    resetInput();
  }, [resetInput, revokePreview]);

  const handleCropConfirm = useCallback(
    (croppedFile: File) => {
      const validationError = validateFinalImageFile(croppedFile);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setPendingCrop((current) => {
        revokePreview(current?.src);
        return null;
      });
      commitFile(croppedFile);
      resetInput();
    },
    [commitFile, resetInput, revokePreview, validateFinalImageFile],
  );

  const cropDialogProps = useMemo(() => {
    if (!pendingCrop || !cropOptions) {
      return null;
    }

    return {
      src: pendingCrop.src,
      fileName: pendingCrop.file.name,
      aspect: cropOptions.aspect,
      outputWidth: cropOptions.outputWidth,
      outputHeight: cropOptions.outputHeight,
      cropShape: cropOptions.cropShape,
    };
  }, [cropOptions, pendingCrop]);

  return (
    <>
      <div className={cn("flex flex-col items-center", className)}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileInputChange}
        />

        <div className="relative">
          <div
            className={cn(
              "group/avatar relative h-24 w-24 cursor-pointer overflow-hidden rounded-2xl border border-dashed transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 bg-accent hover:border-muted-foreground/20",
              previewUrl && "border-solid",
            )}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={openFileDialog}
          >
            {previewUrl ? (
              // Blob/object URLs are used for local previews, so next/image is not a good fit here.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt={t("imageCropper.previewAlt")}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="size-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {file && (
            <Button
              size="icon"
              variant="outline"
              onClick={handleRemove}
              className="absolute end-0 top-0 size-6 rounded-full"
              aria-label={t("imageCropper.remove")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {cropDialogProps ? (
        <ImageCropDialog
          open
          {...cropDialogProps}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </>
  );
}
