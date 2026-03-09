"use client";

import { FormEvent, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import AvatarUpload from "@/components/ui/avatar-upload";
import ColorPicker from "@/components/ui/color-picker";
import type { FileWithPreview } from "@/hooks/use-file-upload";

interface TeamColor {
  hex: string;
  name: string;
}

type TeamStatus = "affiliated" | "suspended";

interface TeamGeneralFormProps {
  team: {
    _id: string;
    name: string;
    slug: string;
    nickname?: string | null;
    logoUrl?: string | null;
    status: "affiliated" | "invited" | "suspended";
    colors?: string[] | null;
    colorNames?: string[] | null;
  };
  orgSlug: string;
}

export function TeamGeneralForm({ team, orgSlug }: TeamGeneralFormProps) {
  const t = useTranslations("Common");
  const updateTeam = useMutation(api.clubs.update);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

  const [name, setName] = useState(team.name);
  // Use slug as nickname since nickname is the slug
  const [nickname, setNickname] = useState(team.slug || "");
  const [status, setStatus] = useState<TeamStatus>(
    team.status === "suspended" ? "suspended" : "affiliated",
  );
  const [colors, setColors] = useState<TeamColor[]>(() => {
    if (team.colors && team.colors.length > 0) {
      return team.colors.map((hex, index) => ({
        hex,
        name: team.colorNames?.[index] || "",
      }));
    }
    return [];
  });
  const [currentColor, setCurrentColor] = useState("#1E3A8A");
  const [currentColorName, setCurrentColorName] = useState("");
  const [isFetchingColorName, setIsFetchingColorName] = useState(false);
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(
    null,
  );
  const [logoFile, setLogoFile] = useState<FileWithPreview | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!currentColor || currentColor.length < 4 || editingColorIndex !== null)
      return;

    const hex = currentColor.replace("#", "");
    const controller = new AbortController();

    const fetchColorName = async () => {
      setIsFetchingColorName(true);
      try {
        const response = await fetch(
          `https://www.thecolorapi.com/id?hex=${hex}&format=json`,
          { signal: controller.signal },
        );
        if (response.ok) {
          const data = await response.json();
          if (data.name?.value) {
            setCurrentColorName(data.name.value);
          }
        }
      } catch {
        // Ignore abort errors and network failures
      } finally {
        setIsFetchingColorName(false);
      }
    };

    const timeoutId = setTimeout(fetchColorName, 300);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [currentColor, editingColorIndex]);

  const handleFileChange = (file: FileWithPreview | null) => {
    setLogoFile(file);
  };

  const uploadLogo = async (): Promise<Id<"_storage"> | undefined> => {
    if (!logoFile || !(logoFile.file instanceof File)) {
      return undefined;
    }

    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": logoFile.file.type },
      body: logoFile.file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload logo");
    }

    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const logoStorageId = await uploadLogo();
      const colorsToSave = colors.length > 0 ? colors : [];

      await updateTeam({
        clubId: team._id as Id<"clubs">,
        name,
        nickname,
        status,
        logoStorageId,
        colors:
          colorsToSave.length > 0 ? colorsToSave.map((c) => c.hex) : undefined,
        colorNames:
          colorsToSave.length > 0
            ? colorsToSave.map((c) => c.name).filter(Boolean)
            : undefined,
      });
    } catch (error) {
      console.error("[TeamGeneralForm] Failed to update team:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addOrUpdateColor = (hex: string) => {
    if (editingColorIndex !== null) {
      const newColors = [...colors];
      newColors[editingColorIndex] = { hex, name: currentColorName };
      setColors(newColors);
      setEditingColorIndex(null);
      setCurrentColorName("");
      setCurrentColor("#1E3A8A");
    } else {
      if (colors.length < 3 && !colors.some((c) => c.hex === hex)) {
        setColors([...colors, { hex, name: currentColorName }]);
        setCurrentColorName("");
        setCurrentColor("#1E3A8A");
      }
    }
  };

  const editColor = (index: number) => {
    setEditingColorIndex(index);
    setCurrentColor(colors[index].hex);
    setCurrentColorName(colors[index].name);
  };

  const cancelEdit = () => {
    setEditingColorIndex(null);
    setCurrentColorName("");
    setCurrentColor("#1E3A8A");
  };

  const removeColor = (index: number) => {
    setColors(colors.filter((_, i) => i !== index));
    if (editingColorIndex === index) {
      cancelEdit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
        <AvatarUpload
          onFileChange={handleFileChange}
          defaultAvatar={team.logoUrl || undefined}
        />

        <FieldGroup className="flex-1 gap-4">
          <Field>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder={t("teams.name")}
            />
          </Field>

          <Field>
            <Input
              value={nickname}
              onChange={(e) => {
                // Only allow lowercase letters, numbers, and hyphens (URL-safe slug)
                const sanitized = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "");
                setNickname(sanitized);
              }}
              placeholder={t("teams.nickname")}
              pattern="[a-z0-9-]+"
              title="Only lowercase letters, numbers, and hyphens allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("teams.nicknameDescription", {
                fallback: "This will be used as the team URL",
              })}
            </p>
          </Field>

          <Field>
            <FieldLabel>{t("teams.status")}</FieldLabel>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as TeamStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("teams.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="affiliated">
                  {t("teams.statusOptions.affiliated")}
                </SelectItem>
                <SelectItem value="suspended">
                  {t("teams.statusOptions.suspended")}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </div>

      <Field>
        <FieldLabel>{t("teams.colors")}</FieldLabel>
        <div className="flex flex-col gap-3">
          {colors.length > 0 && (
            <div className="flex flex-col gap-2">
              {colors.map((color, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div
                    className="size-6 rounded-full border-2 border-border shrink-0"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {color.name || "Unnamed"}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => editColor(index)}
                      disabled={
                        editingColorIndex !== null &&
                        editingColorIndex !== index
                      }
                    >
                      {t("actions.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => removeColor(index)}
                      disabled={
                        editingColorIndex !== null &&
                        editingColorIndex !== index
                      }
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(colors.length < 3 || editingColorIndex !== null) && (
            <div className="flex flex-col gap-2 p-2 border rounded-lg">
              <p className="text-xs font-medium">
                {editingColorIndex !== null
                  ? t("actions.edit")
                  : t("actions.add")}
              </p>
              <div className="flex items-center gap-2">
                <ColorPicker
                  value={currentColor}
                  onChange={setCurrentColor}
                  handleAdd={addOrUpdateColor}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    className="size-8 rounded-full border-2 border-border flex items-center justify-center hover:border-primary transition-colors cursor-pointer shrink-0"
                    style={{ backgroundColor: currentColor }}
                  />
                </ColorPicker>
                <Input
                  placeholder={t("teams.colorName")}
                  value={currentColorName}
                  onChange={(e) => setCurrentColorName(e.target.value)}
                  className="flex-1 h-8 text-xs"
                  disabled={isFetchingColorName}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => addOrUpdateColor(currentColor)}
                  disabled={!currentColorName.trim()}
                >
                  {editingColorIndex !== null
                    ? t("actions.save")
                    : t("actions.add")}
                </Button>
                {editingColorIndex !== null && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={cancelEdit}
                  >
                    {t("actions.cancel")}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Field>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t("actions.saving") : t("actions.save")}
        </Button>
      </div>
    </form>
  );
}
