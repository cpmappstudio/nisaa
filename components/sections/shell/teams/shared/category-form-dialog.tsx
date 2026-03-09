"use client";

import { FormEvent, useState, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Gender = "male" | "female" | "mixed";
type CategoryStatus = "active" | "inactive";
type DivisionType = "alphabetic" | "greek" | "numeric";

interface AgeCategory {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
}

interface CategoryData {
  _id: string;
  name: string;
  ageGroup: string;
  gender: Gender;
  status: CategoryStatus;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
  orgSlug: string;
  category?: CategoryData | null;
}

interface FormState {
  ageGroup: string;
  gender: Gender;
  division: string;
  status: CategoryStatus;
}

const INITIAL_FORM_STATE: FormState = {
  ageGroup: "",
  gender: "male",
  division: "",
  status: "active",
};

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
];

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
];

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
];

const DEFAULT_DIVISION = "A";

function getDivisionOptions(type: DivisionType): string[] {
  switch (type) {
    case "alphabetic":
      return ALPHABETIC_DIVISIONS;
    case "greek":
      return GREEK_DIVISIONS;
    case "numeric":
      return NUMERIC_DIVISIONS;
    default:
      return ALPHABETIC_DIVISIONS;
  }
}

function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function deriveDivisionFromCategoryName(
  name: string,
  ageGroup: string,
): string {
  const normalizedName = normalizeSpaces(name);
  const normalizedAgeGroup = normalizeSpaces(ageGroup);

  if (!normalizedName || !normalizedAgeGroup) {
    return DEFAULT_DIVISION;
  }

  const lowerName = normalizedName.toLowerCase();
  const lowerAge = normalizedAgeGroup.toLowerCase();

  if (lowerName === lowerAge) {
    return DEFAULT_DIVISION;
  }

  const prefix = `${lowerAge} `;
  if (!lowerName.startsWith(prefix)) {
    return DEFAULT_DIVISION;
  }

  const explicitDivision = normalizedName
    .slice(normalizedAgeGroup.length)
    .trim();
  return explicitDivision || DEFAULT_DIVISION;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  clubSlug,
  orgSlug,
  category,
}: CategoryFormDialogProps) {
  const t = useTranslations("Common");
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  const existingCategories = useQuery(api.categories.listByClubSlug, {
    clubSlug,
  });

  const isEditMode = !!category;

  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const ageCategories: AgeCategory[] = teamConfig?.ageCategories || [];
  const enabledGenders = (teamConfig?.enabledGenders as Gender[]) || [
    "male",
    "female",
  ];
  const horizontalDivisions = teamConfig?.horizontalDivisions || {
    enabled: false,
    type: "alphabetic" as DivisionType,
  };

  // Initialize form with category data when editing
  useEffect(() => {
    if (category && open) {
      // Extract division from name if it exists (e.g., "Sub-17 A" -> "A")
      let division = "";
      if (horizontalDivisions.enabled) {
        const parts = category.name.split(" ");
        if (parts.length > 1) {
          division = parts[parts.length - 1];
        }
      }

      setFormState({
        ageGroup: category.ageGroup,
        gender: category.gender,
        division,
        status: category.status,
      });
      setFormError(null);
    }
  }, [category, open, horizontalDivisions.enabled]);

  useEffect(() => {
    if (!open) {
      setFormError(null);
    }
  }, [open]);

  const availableDivisions = useMemo(() => {
    if (!horizontalDivisions.enabled || isEditMode) {
      return [];
    }

    const allDivisions = getDivisionOptions(
      horizontalDivisions.type as DivisionType,
    );

    if (!formState.ageGroup || !formState.gender || !existingCategories) {
      return allDivisions;
    }

    const usedDivisions = existingCategories
      .filter(
        (cat) =>
          cat.ageGroup.toLowerCase() === formState.ageGroup.toLowerCase() &&
          cat.gender === formState.gender,
      )
      .map((cat) =>
        deriveDivisionFromCategoryName(cat.name, cat.ageGroup).toLowerCase(),
      );

    return allDivisions.filter(
      (div) => !usedDivisions.includes(div.toLowerCase()),
    );
  }, [
    horizontalDivisions.enabled,
    horizontalDivisions.type,
    formState.ageGroup,
    formState.gender,
    existingCategories,
    isEditMode,
  ]);

  const generateCategoryName = (): string => {
    if (horizontalDivisions.enabled && formState.division) {
      return `${formState.ageGroup} ${formState.division}`;
    }
    return formState.ageGroup;
  };

  const hasDuplicateCategory = useMemo(() => {
    if (
      isEditMode ||
      !existingCategories ||
      !formState.ageGroup ||
      !formState.gender
    ) {
      return false;
    }

    if (horizontalDivisions.enabled && !formState.division) {
      return false;
    }

    const targetAgeGroup = normalizeSpaces(formState.ageGroup).toLowerCase();
    const targetDivision = (
      horizontalDivisions.enabled ? formState.division : DEFAULT_DIVISION
    ).toLowerCase();

    return existingCategories.some((cat) => {
      const catAgeGroup = normalizeSpaces(cat.ageGroup).toLowerCase();
      const catDivision = deriveDivisionFromCategoryName(
        cat.name,
        cat.ageGroup,
      ).toLowerCase();

      return (
        catAgeGroup === targetAgeGroup &&
        cat.gender === formState.gender &&
        catDivision === targetDivision
      );
    });
  }, [
    existingCategories,
    formState.ageGroup,
    formState.gender,
    formState.division,
    horizontalDivisions.enabled,
    isEditMode,
  ]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formState.ageGroup || !formState.gender) return;
    if (!isEditMode && horizontalDivisions.enabled && !formState.division)
      return;
    if (!isEditMode && hasDuplicateCategory) {
      setFormError(
        "A category with the same age group, gender, and division already exists",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        // Update existing category - only gender and status can change
        await updateCategory({
          categoryId: category._id as Id<"categories">,
          gender: formState.gender,
          status: formState.status,
        });
      } else {
        // Create new category
        await createCategory({
          clubSlug,
          name: generateCategoryName(),
          ageGroup: formState.ageGroup,
          gender: formState.gender,
          division: horizontalDivisions.enabled
            ? formState.division || DEFAULT_DIVISION
            : undefined,
        });
      }
      setFormState(INITIAL_FORM_STATE);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to save category. Please try again.";
      setFormError(message);
      console.error(
        `[CategoryFormDialog] Failed to ${isEditMode ? "update" : "create"} category:`,
        error,
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormState(INITIAL_FORM_STATE);
      setFormError(null);
    }
    onOpenChange(newOpen);
  };

  const updateField = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormError(null);
    setFormState((prev) => {
      const newState = { ...prev, [field]: value };
      if (field === "ageGroup" || field === "gender") {
        newState.division = "";
      }
      return newState;
    });
  };

  const isFormValid =
    formState.ageGroup &&
    formState.gender &&
    (!horizontalDivisions.enabled || isEditMode || formState.division) &&
    (isEditMode || !hasDuplicateCategory);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">
            {isEditMode
              ? `${t("actions.edit")} ${t("categories.title")}`
              : `${t("actions.create")} ${t("categories.title")}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {isEditMode ? (
            // Edit mode: Show category name as read-only
            <div className="mb-4">
              <FieldLabel>{t("categories.name")}</FieldLabel>
              <Input
                value={category?.name || ""}
                disabled
                className="mt-2 bg-muted"
              />
            </div>
          ) : (
            // Create mode: Show age group and division selectors
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <FieldLabel>{t("categories.ageGroup")}</FieldLabel>
                <Select
                  value={formState.ageGroup}
                  onValueChange={(value) => updateField("ageGroup", value)}
                >
                  <SelectTrigger className="w-full mt-2">
                    <SelectValue placeholder={t("categories.ageGroup")} />
                  </SelectTrigger>
                  <SelectContent>
                    {ageCategories.length > 0 ? (
                      ageCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name} ({cat.minAge}-{cat.maxAge})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        {t("categories.emptyMessage")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {horizontalDivisions.enabled && (
                <div className="w-24 shrink-0">
                  <FieldLabel>{t("categories.horizontalDivision")}</FieldLabel>
                  <Select
                    value={formState.division}
                    onValueChange={(value) => updateField("division", value)}
                    disabled={!formState.ageGroup || !formState.gender}
                  >
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue
                        placeholder={t("categories.selectDivision")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDivisions.length > 0 ? (
                        availableDivisions.map((division) => (
                          <SelectItem key={division} value={division}>
                            {division}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          {t("categories.noDivisionsAvailable")}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <FieldLabel>{t("categories.gender")}</FieldLabel>
            <Select
              value={formState.gender}
              onValueChange={(value) => updateField("gender", value as Gender)}
            >
              <SelectTrigger className="w-full mt-2">
                <SelectValue placeholder={t("categories.gender")} />
              </SelectTrigger>
              <SelectContent>
                {enabledGenders.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {t(`categories.genderOptions.${gender}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEditMode && (
            <div className="mt-4">
              <FieldLabel>{t("categories.status")}</FieldLabel>
              <Select
                value={formState.status}
                onValueChange={(value) =>
                  updateField("status", value as CategoryStatus)
                }
              >
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder={t("categories.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">
                    {t("categories.statusOptions.active")}
                  </SelectItem>
                  <SelectItem value="inactive">
                    {t("categories.statusOptions.inactive")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {formError && (
            <p className="mt-3 text-sm text-destructive">{formError}</p>
          )}

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid}>
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
