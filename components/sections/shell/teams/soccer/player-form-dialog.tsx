"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
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
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AvatarUpload from "@/components/ui/avatar-upload";
import { cn } from "@/lib/utils";
import { normalizeCountryValue } from "@/lib/countries/countries";
import type {
  PlayerFormDialogProps,
  PlayerGender,
  PlayerDominantProfile,
} from "@/components/sections/shell/teams/shared/player-form.types";
import type { FileWithPreview } from "@/hooks/use-file-upload";

export function SoccerPlayerFormDialog({
  open,
  onOpenChange,
  clubSlug,
  positions,
  player,
}: PlayerFormDialogProps) {
  const t = useTranslations("Common");
  const generateUploadUrl = useMutation(api.players.generateUploadUrl);
  const createSoccerPlayer = useMutation(api.soccerPlayers.createPlayer);
  const updateSoccerPlayer = useMutation(api.soccerPlayers.updatePlayer);

  const categories = useQuery(api.categories.listByClubSlug, {
    clubSlug,
  });

  const isEditMode = Boolean(player);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [secondLastName, setSecondLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined);
  const [documentNumber, setDocumentNumber] = useState("");
  const [gender, setGender] = useState<PlayerGender | "">("");
  const [country, setCountry] = useState("");
  const [position, setPosition] = useState("");
  const [dominantProfile, setDominantProfile] = useState<
    PlayerDominantProfile | ""
  >("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [cometNumber, setCometNumber] = useState("");
  const [fifaId, setFifaId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [photoFile, setPhotoFile] = useState<FileWithPreview | null>(null);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const positionLabel = useMemo(() => {
    if (!position) {
      return "";
    }

    const currentPosition = positions.find((item) => item.id === position);
    return currentPosition
      ? `${currentPosition.name} (${currentPosition.abbreviation})`
      : position;
  }, [position, positions]);

  const categoryLabel = useMemo(() => {
    if (!categoryId || !categories) {
      return "";
    }

    return (
      categories.find((category) => category._id === categoryId)?.name ?? ""
    );
  }, [categories, categoryId]);

  const genderLabel = useMemo(() => {
    switch (gender) {
      case "male":
        return t("players.genderOptions.male");
      case "female":
        return t("players.genderOptions.female");
      case "mixed":
        return t("players.genderOptions.mixed");
      default:
        return "";
    }
  }, [gender, t]);

  const dominantProfileLabel = useMemo(() => {
    switch (dominantProfile) {
      case "right":
        return t("players.dominantProfileOptions.right");
      case "left":
        return t("players.dominantProfileOptions.left");
      case "both":
        return t("players.dominantProfileOptions.both");
      default:
        return "";
    }
  }, [dominantProfile, t]);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!player) {
      setFirstName("");
      setLastName("");
      setSecondLastName("");
      setDateOfBirth(undefined);
      setDocumentNumber("");
      setGender("");
      setCountry("");
      setPosition("");
      setDominantProfile("");
      setHeight("");
      setWeight("");
      setCometNumber("");
      setFifaId("");
      setCategoryId("");
      setPhotoFile(null);
      setCurrentPhotoUrl(null);
      return;
    }

    setFirstName(player.firstName ?? "");
    setLastName(player.lastName ?? "");
    setSecondLastName(player.secondLastName ?? "");
    setDateOfBirth(
      player.dateOfBirth
        ? parse(player.dateOfBirth, "yyyy-MM-dd", new Date())
        : undefined,
    );
    setDocumentNumber(player.documentNumber ?? "");
    setGender(player.gender ?? "");
    setCountry(normalizeCountryValue(player.country));
    setPosition(player.position ?? "");
    setDominantProfile(player.dominantProfile ?? "");
    setHeight(player.height?.toString() ?? "");
    setWeight(player.weight?.toString() ?? "");
    setCometNumber(player.cometNumber ?? "");
    setFifaId(player.fifaId ?? "");
    setCategoryId(player.categoryId ?? "");
    setCurrentPhotoUrl(player.photoUrl ?? null);
    setPhotoFile(null);
  }, [open, player]);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setSecondLastName("");
    setDateOfBirth(undefined);
    setDocumentNumber("");
    setGender("");
    setCountry("");
    setPosition("");
    setDominantProfile("");
    setHeight("");
    setWeight("");
    setCometNumber("");
    setFifaId("");
    setCategoryId("");
    setPhotoFile(null);
    setCurrentPhotoUrl(null);
    setIsSubmitting(false);
  };

  const uploadPhoto = async (): Promise<Id<"_storage"> | undefined> => {
    if (!photoFile || !(photoFile.file instanceof File)) {
      return undefined;
    }

    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": photoFile.file.type },
      body: photoFile.file,
    });

    if (!response.ok) {
      throw new Error("Failed to upload photo");
    }

    const { storageId } = await response.json();
    return storageId as Id<"_storage">;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCountry = normalizeCountryValue(country);

    if (
      !categoryId ||
      !dateOfBirth ||
      !height ||
      !weight ||
      !normalizedCountry ||
      !firstName.trim() ||
      !lastName.trim() ||
      !secondLastName.trim() ||
      !documentNumber.trim() ||
      !gender.trim() ||
      !position.trim() ||
      !dominantProfile.trim() ||
      !cometNumber.trim()
    ) {
      return;
    }

    const selectedGender = gender as PlayerGender;
    const selectedDominantProfile = dominantProfile as PlayerDominantProfile;

    setIsSubmitting(true);

    try {
      const photoStorageId = await uploadPhoto();

      if (isEditMode && player) {
        await updateSoccerPlayer({
          playerId: player._id as Id<"players">,
          firstName,
          lastName,
          secondLastName,
          ...(photoStorageId && { photoStorageId }),
          dateOfBirth: format(dateOfBirth, "yyyy-MM-dd"),
          documentNumber,
          gender: selectedGender,
          country: normalizedCountry,
          categoryId: categoryId as Id<"categories">,
          position,
          dominantProfile: selectedDominantProfile,
          height: parseInt(height, 10),
          weight: parseInt(weight, 10),
          cometNumber,
          fifaId,
        });
      } else {
        await createSoccerPlayer({
          firstName,
          lastName,
          secondLastName,
          photoStorageId,
          dateOfBirth: format(dateOfBirth, "yyyy-MM-dd"),
          documentNumber,
          gender: selectedGender,
          country: normalizedCountry,
          categoryId: categoryId as Id<"categories">,
          position,
          dominantProfile: selectedDominantProfile,
          height: parseInt(height, 10),
          weight: parseInt(weight, 10),
          cometNumber,
          fifaId,
        });
      }

      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error(
        `[SoccerPlayerFormDialog] Failed to ${isEditMode ? "update" : "create"} player:`,
        error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setTimeout(resetForm, 150);
    }
  };

  const handleFileChange = (file: FileWithPreview | null) => {
    setPhotoFile(file);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
          <DialogTitle>
            {isEditMode ? t("players.edit") : t("players.create")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <AvatarUpload
                  onFileChange={handleFileChange}
                  defaultAvatar={currentPhotoUrl ?? undefined}
                />

                <FieldGroup className="w-full flex-1 gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel>{t("players.cometNumber")}</FieldLabel>
                      <Input
                        value={cometNumber}
                        onChange={(e) => setCometNumber(e.target.value)}
                        placeholder={t("players.cometNumber")}
                        required
                      />
                    </Field>

                    <Field>
                      <FieldLabel>{t("players.fifaId")}</FieldLabel>
                      <Input
                        value={fifaId}
                        onChange={(e) => setFifaId(e.target.value)}
                        placeholder={t("players.fifaId")}
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </div>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t("players.documentNumber")}</FieldLabel>
                    <Input
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value)}
                      placeholder={t("players.documentNumber")}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.gender")}</FieldLabel>
                    <Select
                      value={gender}
                      onValueChange={(value) =>
                        setGender(value as PlayerGender)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t("players.selectGender")}>
                          {genderLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">
                          {t("players.genderOptions.male")}
                        </SelectItem>
                        <SelectItem value="female">
                          {t("players.genderOptions.female")}
                        </SelectItem>
                        <SelectItem value="mixed">
                          {t("players.genderOptions.mixed")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel>{t("players.firstSurname")}</FieldLabel>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder={t("players.firstSurname")}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.secondSurname")}</FieldLabel>
                    <Input
                      value={secondLastName}
                      onChange={(e) => setSecondLastName(e.target.value)}
                      placeholder={t("players.secondSurname")}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.givenNames")}</FieldLabel>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder={t("players.givenNames")}
                      required
                    />
                  </Field>
                </div>
              </FieldGroup>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t("players.dateOfBirth")}</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !dateOfBirth && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateOfBirth ? (
                            format(dateOfBirth, "PPP")
                          ) : (
                            <span>{t("players.dateOfBirth")}</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={dateOfBirth}
                          onSelect={setDateOfBirth}
                          captionLayout="dropdown"
                          fromYear={1960}
                          toYear={new Date().getFullYear()}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.country")}</FieldLabel>
                    <CountryCombobox
                      value={country}
                      onValueChange={setCountry}
                      placeholder={t("players.selectCountry")}
                      searchPlaceholder={`${t("actions.search")} ${t("players.country").toLowerCase()}...`}
                      emptyText={t("table.noResults")}
                    />
                  </Field>
                </div>
              </FieldGroup>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>{t("players.position")}</FieldLabel>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("players.selectPosition")}>
                          {positionLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map((pos) => (
                          <SelectItem key={pos.id} value={pos.id}>
                            {pos.name} ({pos.abbreviation})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.dominantProfile")}</FieldLabel>
                    <Select
                      value={dominantProfile}
                      onValueChange={(value) =>
                        setDominantProfile(value as PlayerDominantProfile)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t("players.selectDominantProfile")}
                        >
                          {dominantProfileLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="right">
                          {t("players.dominantProfileOptions.right")}
                        </SelectItem>
                        <SelectItem value="left">
                          {t("players.dominantProfileOptions.left")}
                        </SelectItem>
                        <SelectItem value="both">
                          {t("players.dominantProfileOptions.both")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>

              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field>
                    <FieldLabel>{t("players.height")}</FieldLabel>
                    <Input
                      type="number"
                      min="100"
                      max="250"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="cm"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.weight")}</FieldLabel>
                    <Input
                      type="number"
                      min="30"
                      max="200"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="kg"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>{t("players.category")}</FieldLabel>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("players.selectCategory")}>
                          {categoryLabel}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category._id} value={category._id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </FieldGroup>
            </div>
          </div>

          <DialogFooter className="border-t px-4 py-3 sm:px-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !categoryId}>
              {isSubmitting
                ? t("actions.loading")
                : isEditMode
                  ? t("actions.save")
                  : t("actions.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
