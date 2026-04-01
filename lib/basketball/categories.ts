import { parseIsoDateAsLocal } from "@/lib/utils/date";

export type DivisionType = "alphabetic" | "greek" | "numeric";

export interface LeagueAgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
}

export const DEFAULT_DIVISION = "A";

const ALPHABETIC_DIVISIONS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

const GREEK_DIVISIONS = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Eta",
  "Theta",
  "Iota",
  "Kappa",
  "Lambda",
  "Mu",
  "Nu",
  "Xi",
  "Omicron",
  "Pi",
  "Rho",
  "Sigma",
  "Tau",
  "Upsilon",
  "Phi",
  "Chi",
  "Psi",
  "Omega",
] as const;

const NUMERIC_DIVISIONS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
] as const;

export function getDivisionOptions(type: DivisionType): string[] {
  switch (type) {
    case "alphabetic":
      return [...ALPHABETIC_DIVISIONS];
    case "greek":
      return [...GREEK_DIVISIONS];
    case "numeric":
      return [...NUMERIC_DIVISIONS];
    default:
      return [...ALPHABETIC_DIVISIONS];
  }
}

export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeAgeGroup(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

export function normalizeDivision(value: string): string {
  return normalizeSpaces(value).toLowerCase();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildCategoryName(
  ageGroup: string,
  division: string | undefined,
  options?: { includeDivision?: boolean },
): string {
  const normalizedAgeGroup = normalizeSpaces(ageGroup);
  if (!options?.includeDivision) {
    return normalizedAgeGroup;
  }

  return `${normalizedAgeGroup} ${normalizeSpaces(division ?? DEFAULT_DIVISION)}`;
}

export function categoryNameHasExplicitDivision(
  name: string,
  ageGroup: string,
): boolean {
  return normalizeAgeGroup(name) !== normalizeAgeGroup(ageGroup);
}

export function deriveDivisionFromCategoryName(
  name: string,
  ageGroup: string,
): string {
  const normalizedName = normalizeSpaces(name);
  const normalizedAgeGroup = normalizeSpaces(ageGroup);

  if (!normalizedName || !normalizedAgeGroup) {
    return DEFAULT_DIVISION;
  }

  const prefixRegex = new RegExp(
    `^${escapeRegExp(normalizedAgeGroup)}(?:\\s+(.*))?$`,
    "i",
  );
  const match = normalizedName.match(prefixRegex);
  const explicitDivision = match?.[1]?.trim();

  return explicitDivision ? normalizeSpaces(explicitDivision) : DEFAULT_DIVISION;
}

export function renameCategoryNameForLeagueAgeGroup(
  currentName: string,
  currentAgeGroup: string,
  nextAgeGroup: string,
): string {
  return buildCategoryName(
    nextAgeGroup,
    deriveDivisionFromCategoryName(currentName, currentAgeGroup),
    {
      includeDivision: categoryNameHasExplicitDivision(
        currentName,
        currentAgeGroup,
      ),
    },
  );
}

export function calculateAgeFromDateOfBirth(
  dateOfBirth: string,
  today = new Date(),
): number | null {
  const birthDate = parseIsoDateAsLocal(dateOfBirth);
  if (!birthDate) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function findLeagueAgeCategoryByAge(
  ageCategories: LeagueAgeCategory[],
  age: number,
): LeagueAgeCategory | null {
  return (
    ageCategories.find(
      (category) => age >= category.minAge && age <= category.maxAge,
    ) ?? null
  );
}

export function findLeagueAgeCategoryByDateOfBirth(
  ageCategories: LeagueAgeCategory[],
  dateOfBirth: string,
  today = new Date(),
): LeagueAgeCategory | null {
  const age = calculateAgeFromDateOfBirth(dateOfBirth, today);
  if (age === null) {
    return null;
  }

  return findLeagueAgeCategoryByAge(ageCategories, age);
}

export function findLeagueAgeCategoryByAgeGroup(
  ageCategories: LeagueAgeCategory[],
  ageGroup: string | undefined | null,
): LeagueAgeCategory | null {
  if (!ageGroup) {
    return null;
  }

  const normalizedTarget = normalizeAgeGroup(ageGroup);
  return (
    ageCategories.find(
      (category) => normalizeAgeGroup(category.name) === normalizedTarget,
    ) ?? null
  );
}
