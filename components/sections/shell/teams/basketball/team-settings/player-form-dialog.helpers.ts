import { format, parse } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";
import { normalizeCountryValue } from "@/lib/countries/countries";
import {
  deriveDivisionFromCategoryName,
  findLeagueAgeCategoryByAgeGroup,
  type LeagueAgeCategory,
} from "@/lib/basketball/categories";
import type { PlayerData, PlayerFormValues } from "./player-form-dialog.types";

export function createPlayerFormValues(
  player?: PlayerData | null,
  ageCategories: LeagueAgeCategory[] = [],
): PlayerFormValues {
  const matchedLeagueCategory =
    (player?.categoryLeagueCategoryId
      ? (ageCategories.find(
          (category) => category.id === player.categoryLeagueCategoryId,
        ) ?? null)
      : null) ??
    findLeagueAgeCategoryByAgeGroup(ageCategories, player?.categoryAgeGroup);

  return {
    firstName: player?.firstName ?? "",
    lastName: player?.lastName ?? "",
    dateOfBirth: player?.dateOfBirth
      ? parse(player.dateOfBirth, "yyyy-MM-dd", new Date())
      : undefined,
    gender: player?.categoryGender ?? "",
    jerseyNumber: player?.jerseyNumber?.toString() ?? "",
    position: player?.position ?? "",
    height: player?.height?.toString() ?? "",
    weight: player?.weight?.toString() ?? "",
    country: normalizeCountryValue(player?.country),
    leagueCategoryId: matchedLeagueCategory?.id ?? "",
    division:
      player?.categoryName && player?.categoryAgeGroup
        ? deriveDivisionFromCategoryName(
            player.categoryName,
            player.categoryAgeGroup,
          )
        : "",
    photoFile: null,
    currentPhotoUrl: player?.photoUrl ?? null,
  };
}

export function isPlayerFormValid(
  values: PlayerFormValues,
  horizontalDivisionsEnabled: boolean,
): boolean {
  return Boolean(
    values.firstName.trim() &&
      values.lastName.trim() &&
      values.gender &&
      values.leagueCategoryId &&
      (!horizontalDivisionsEnabled || values.division),
  );
}

export function buildPlayerMutationPayload(args: { values: PlayerFormValues }) {
  const { values } = args;

  if (!values.gender) {
    throw new Error("Player form payload is incomplete");
  }

  const normalizedCountry = normalizeCountryValue(values.country);

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dateOfBirth: values.dateOfBirth
      ? format(values.dateOfBirth, "yyyy-MM-dd")
      : undefined,
    gender: values.gender,
    jerseyNumber: values.jerseyNumber
      ? parseInt(values.jerseyNumber, 10)
      : undefined,
    leagueCategoryId: values.leagueCategoryId,
    division: values.division || undefined,
    position: values.position || undefined,
    height: values.height ? parseInt(values.height, 10) : undefined,
    weight: values.weight ? parseInt(values.weight, 10) : undefined,
    country: normalizedCountry || undefined,
  };
}

export async function uploadPlayerPhoto(
  photoFile: PlayerFormValues["photoFile"],
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage"> | undefined> {
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
}
