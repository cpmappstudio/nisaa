"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useOrganization } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import SettingsItem from "./settings-item";
import { SeasonsSettings } from "./seasons-settings";
import { useSportTerminology } from "@/components/providers/sport-provider";
import { DEFAULT_TENANT_SLUG, isSingleTenantMode } from "@/lib/tenancy/config";

type Gender = "male" | "female" | "mixed";
type DivisionType = "alphabetic" | "greek" | "numeric";
type SportType = "basketball" | "soccer";

interface NewCategory {
  name: string;
  minAge: string;
  maxAge: string;
}

interface NewPosition {
  name: string;
  abbreviation: string;
}

interface EditingCategory {
  id: string;
  name: string;
  minAge: string;
  maxAge: string;
}

interface EditingPosition {
  id: string;
  name: string;
  abbreviation: string;
}

const MAX_VISIBLE_ITEMS = 6;

export function TeamConfigSettings() {
  const t = useTranslations("Settings.general.teamConfig");
  const tSeasons = useTranslations("Settings.general.seasons");
  const tCommon = useTranslations("Common");
  const { organization } = useOrganization();
  const params = useParams<{ tenant?: string }>();
  const { clubs } = useSportTerminology();
  const tenant = typeof params.tenant === "string" ? params.tenant : null;
  const singleTenantMode = isSingleTenantMode();
  const leagueSlug = singleTenantMode
    ? (tenant ?? DEFAULT_TENANT_SLUG)
    : (organization?.slug ?? null);
  const [newCategory, setNewCategory] = useState<NewCategory>({
    name: "",
    minAge: "",
    maxAge: "",
  });
  const [newPosition, setNewPosition] = useState<NewPosition>({
    name: "",
    abbreviation: "",
  });
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<EditingCategory | null>(null);
  const [editingPosition, setEditingPosition] =
    useState<EditingPosition | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [savingPositionId, setSavingPositionId] = useState<string | null>(null);
  const [showAllAgeCategories, setShowAllAgeCategories] = useState(false);
  const [showAllPositions, setShowAllPositions] = useState(false);
  const [isUpdatingSportType, setIsUpdatingSportType] = useState(false);

  const teamConfig = useQuery(
    api.leagueSettings.getTeamConfig,
    leagueSlug ? { leagueSlug } : "skip",
  );
  const sportTypeChangeStatus = useQuery(
    api.leagueSettings.getSportTypeChangeStatus,
    leagueSlug ? { leagueSlug } : "skip",
  );

  const updateSportType = useMutation(api.leagueSettings.updateSportType);
  const addAgeCategory = useMutation(api.leagueSettings.addAgeCategory);
  const removeAgeCategory = useMutation(api.leagueSettings.removeAgeCategory);
  const updateAgeCategory = useMutation(api.leagueSettings.updateAgeCategory);
  const addPosition = useMutation(api.leagueSettings.addPosition);
  const removePosition = useMutation(api.leagueSettings.removePosition);
  const updatePosition = useMutation(api.leagueSettings.updatePosition);
  const updateEnabledGenders = useMutation(
    api.leagueSettings.updateEnabledGenders,
  );
  const updateHorizontalDivisions = useMutation(
    api.leagueSettings.updateHorizontalDivisions,
  );

  if (!leagueSlug) {
    return null;
  }

  if (teamConfig === undefined) {
    return (
      <div className="text-sm text-muted-foreground">
        {tCommon("actions.loading")}
      </div>
    );
  }

  if (teamConfig === null) {
    return (
      <div className="text-sm text-muted-foreground">
        Team configuration is not available for this organization yet.
      </div>
    );
  }

  const ageCategories = teamConfig.ageCategories;
  const positions = teamConfig.positions ?? [];
  const visibleAgeCategories = showAllAgeCategories
    ? ageCategories
    : ageCategories.slice(0, MAX_VISIBLE_ITEMS);
  const visiblePositions = showAllPositions
    ? positions
    : positions.slice(0, MAX_VISIBLE_ITEMS);
  const enabledGenders = teamConfig.enabledGenders;
  const horizontalDivisions = teamConfig.horizontalDivisions ?? {
    enabled: false,
    type: "alphabetic" as DivisionType,
  };
  const sportTypeLocked = sportTypeChangeStatus
    ? !sportTypeChangeStatus.canChange
    : false;

  const handleSportTypeChange = async (nextSportType: SportType) => {
    if (nextSportType === teamConfig.sportType) {
      return;
    }

    setIsUpdatingSportType(true);
    try {
      await updateSportType({
        leagueSlug,
        sportType: nextSportType,
      });
    } finally {
      setIsUpdatingSportType(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.minAge || !newCategory.maxAge) {
      return;
    }

    setIsAddingCategory(true);
    try {
      await addAgeCategory({
        leagueSlug,
        category: {
          id: crypto.randomUUID(),
          name: newCategory.name,
          minAge: parseInt(newCategory.minAge),
          maxAge: parseInt(newCategory.maxAge),
        },
      });
      setNewCategory({ name: "", minAge: "", maxAge: "" });
    } finally {
      setIsAddingCategory(false);
    }
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await removeAgeCategory({
      leagueSlug,
      categoryId,
    });
  };

  const handleStartEditCategory = (category: {
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
  }) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      minAge: String(category.minAge),
      maxAge: String(category.maxAge),
    });
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) {
      return;
    }

    const name = editingCategory.name.trim();
    const minAge = parseInt(editingCategory.minAge, 10);
    const maxAge = parseInt(editingCategory.maxAge, 10);
    if (!name || Number.isNaN(minAge) || Number.isNaN(maxAge)) {
      return;
    }

    setSavingCategoryId(editingCategory.id);
    try {
      await updateAgeCategory({
        leagueSlug,
        categoryId: editingCategory.id,
        name,
        minAge,
        maxAge,
      });
      setEditingCategory(null);
    } finally {
      setSavingCategoryId(null);
    }
  };

  const handleAddPosition = async () => {
    if (!newPosition.name || !newPosition.abbreviation) {
      return;
    }

    setIsAddingPosition(true);
    try {
      await addPosition({
        leagueSlug,
        position: {
          id: crypto.randomUUID(),
          name: newPosition.name,
          abbreviation: newPosition.abbreviation,
        },
      });
      setNewPosition({ name: "", abbreviation: "" });
    } finally {
      setIsAddingPosition(false);
    }
  };

  const handleRemovePosition = async (positionId: string) => {
    await removePosition({
      leagueSlug,
      positionId,
    });
  };

  const handleStartEditPosition = (position: {
    id: string;
    name: string;
    abbreviation: string;
  }) => {
    setEditingPosition({
      id: position.id,
      name: position.name,
      abbreviation: position.abbreviation,
    });
  };

  const handleSavePosition = async () => {
    if (!editingPosition) {
      return;
    }

    const name = editingPosition.name.trim();
    const abbreviation = editingPosition.abbreviation.trim();
    if (!name || !abbreviation) {
      return;
    }

    setSavingPositionId(editingPosition.id);
    try {
      await updatePosition({
        leagueSlug,
        positionId: editingPosition.id,
        name,
        abbreviation,
      });
      setEditingPosition(null);
    } finally {
      setSavingPositionId(null);
    }
  };

  const handleGenderToggle = async (gender: Gender, checked: boolean) => {
    const newGenders = checked
      ? [...enabledGenders, gender]
      : enabledGenders.filter((g) => g !== gender);

    await updateEnabledGenders({
      leagueSlug,
      enabledGenders: newGenders,
    });
  };

  const handleHorizontalDivisionsToggle = async (enabled: boolean) => {
    await updateHorizontalDivisions({
      leagueSlug,
      horizontalDivisions: enabled
        ? { enabled: true, type: horizontalDivisions.type }
        : undefined,
    });
  };

  const handleDivisionTypeChange = async (type: DivisionType) => {
    await updateHorizontalDivisions({
      leagueSlug,
      horizontalDivisions: { enabled: true, type },
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <SettingsItem
        title={t("sportType.title")}
        description={
          sportTypeLocked
            ? t("sportType.lockedDescription")
            : t("sportType.description")
        }
      >
        <div className="max-w-xs space-y-2">
          <Select
            value={teamConfig.sportType}
            onValueChange={(value) => handleSportTypeChange(value as SportType)}
            disabled={sportTypeLocked || isUpdatingSportType}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("sportType.placeholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basketball">
                {t("sportType.options.basketball")}
              </SelectItem>
              <SelectItem value="soccer">
                {t("sportType.options.soccer")}
              </SelectItem>
            </SelectContent>
          </Select>
          {sportTypeLocked && (
            <p className="text-sm text-muted-foreground">
              {sportTypeChangeStatus?.hasPlayers
                ? t("sportType.lockedReasons.players")
                : t("sportType.lockedReasons.games")}
            </p>
          )}
        </div>
      </SettingsItem>

      {/* Age Categories */}
      <SettingsItem
        title={t("ageCategories.title")}
        description={t("ageCategories.description", { clubs })}
      >
        <div className="flex flex-col gap-4">
          {ageCategories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("ageCategories.empty")}
            </p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {visibleAgeCategories.map((category) => (
                <li key={category.id} className="group marker:text-primary">
                  {editingCategory?.id === category.id ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Input
                        value={editingCategory.name}
                        onChange={(event) =>
                          setEditingCategory((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  name: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="h-7 w-32"
                      />
                      <Input
                        type="number"
                        value={editingCategory.minAge}
                        onChange={(event) =>
                          setEditingCategory((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  minAge: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="h-7 w-16"
                        min={0}
                        max={99}
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="number"
                        value={editingCategory.maxAge}
                        onChange={(event) =>
                          setEditingCategory((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  maxAge: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="h-7 w-16"
                        min={0}
                        max={99}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={handleSaveCategory}
                        disabled={savingCategoryId === category.id}
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setEditingCategory(null)}
                        disabled={savingCategoryId === category.id}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                      <span>
                        {category.name} ({category.minAge}-{category.maxAge}{" "}
                        {tCommon("playerCard.age").toLowerCase()})
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                        onClick={() => handleStartEditCategory(category)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 hover:text-destructive"
                        onClick={() => handleRemoveCategory(category.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {ageCategories.length > MAX_VISIBLE_ITEMS && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllAgeCategories((prev) => !prev)}
            >
              {showAllAgeCategories
                ? tCommon("actions.showLess")
                : tCommon("actions.showMore")}
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.name")}
              </Label>
              <Input
                placeholder={t("ageCategories.namePlaceholder")}
                value={newCategory.name}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, name: e.target.value })
                }
                className="w-32"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.minAge")}
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={newCategory.minAge}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, minAge: e.target.value })
                }
                className="w-20"
                min={0}
                max={99}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("ageCategories.maxAge")}
              </Label>
              <Input
                type="number"
                placeholder="99"
                value={newCategory.maxAge}
                onChange={(e) =>
                  setNewCategory({ ...newCategory, maxAge: e.target.value })
                }
                className="w-20"
                min={0}
                max={99}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground invisible">
                &nbsp;
              </Label>
              <Button
                onClick={handleAddCategory}
                disabled={
                  isAddingCategory ||
                  !newCategory.name ||
                  !newCategory.minAge ||
                  !newCategory.maxAge
                }
                size="icon"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsItem>

      {/* Positions */}
      <SettingsItem
        title={t("positions.title")}
        description={t("positions.description")}
      >
        <div className="flex flex-col gap-4">
          {positions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("positions.empty")}
            </p>
          ) : (
            <ul className="list-disc space-y-1 pl-5">
              {visiblePositions.map((position) => (
                <li key={position.id} className="group marker:text-primary">
                  {editingPosition?.id === position.id ? (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      <Input
                        value={editingPosition.name}
                        onChange={(event) =>
                          setEditingPosition((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  name: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="h-7 w-40"
                      />
                      <Input
                        value={editingPosition.abbreviation}
                        onChange={(event) =>
                          setEditingPosition((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  abbreviation: event.target.value,
                                }
                              : prev,
                          )
                        }
                        className="h-7 w-20"
                        maxLength={5}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={handleSavePosition}
                        disabled={savingPositionId === position.id}
                      >
                        <Check className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={() => setEditingPosition(null)}
                        disabled={savingPositionId === position.id}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary">
                      <span>
                        {position.name} ({position.abbreviation})
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                        onClick={() => handleStartEditPosition(position)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-destructive opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 hover:text-destructive"
                        onClick={() => handleRemovePosition(position.id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {positions.length > MAX_VISIBLE_ITEMS && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowAllPositions((prev) => !prev)}
            >
              {showAllPositions
                ? tCommon("actions.showLess")
                : tCommon("actions.showMore")}
            </Button>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("positions.name")}
              </Label>
              <Input
                placeholder={t("positions.namePlaceholder")}
                value={newPosition.name}
                onChange={(e) =>
                  setNewPosition({ ...newPosition, name: e.target.value })
                }
                className="w-40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("positions.abbreviation")}
              </Label>
              <Input
                placeholder={t("positions.abbreviationPlaceholder")}
                value={newPosition.abbreviation}
                onChange={(e) =>
                  setNewPosition({
                    ...newPosition,
                    abbreviation: e.target.value,
                  })
                }
                className="w-24"
                maxLength={5}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground invisible">
                &nbsp;
              </Label>
              <Button
                onClick={handleAddPosition}
                disabled={
                  isAddingPosition ||
                  !newPosition.name ||
                  !newPosition.abbreviation
                }
                size="icon"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </SettingsItem>

      <SettingsItem
        title={tSeasons("title")}
        description={tSeasons("description")}
      >
        <SeasonsSettings leagueSlug={leagueSlug} />
      </SettingsItem>

      {/* Enabled Genders */}
      <SettingsItem
        title={t("enabledGenders.title")}
        description={t("enabledGenders.description", { clubs })}
      >
        <div className="flex flex-wrap gap-6">
          {(["male", "female", "mixed"] as const).map((gender) => {
            const isChecked = enabledGenders.includes(gender);
            const isDisabled =
              enabledGenders.length === 1 && enabledGenders.includes(gender);

            return (
              <div key={gender} className="flex items-center gap-2">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={(checked: boolean) =>
                    handleGenderToggle(gender, checked)
                  }
                  disabled={isDisabled}
                />
                <Label className="cursor-pointer">
                  {t(`enabledGenders.${gender}`)}
                </Label>
              </div>
            );
          })}
        </div>
      </SettingsItem>

      {/* Horizontal Divisions */}
      <SettingsItem
        title={t("horizontalDivisions.title")}
        description={t("horizontalDivisions.description", { clubs })}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={horizontalDivisions.enabled}
              onChange={handleHorizontalDivisionsToggle}
            />
            <Label>{t("horizontalDivisions.enabled")}</Label>
          </div>

          {horizontalDivisions.enabled && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">
                {t("horizontalDivisions.type")}
              </Label>
              <Select
                value={horizontalDivisions.type}
                onValueChange={(value) =>
                  handleDivisionTypeChange(value as DivisionType)
                }
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alphabetic">
                    {t("horizontalDivisions.types.alphabetic")}
                  </SelectItem>
                  <SelectItem value="greek">
                    {t("horizontalDivisions.types.greek")}
                  </SelectItem>
                  <SelectItem value="numeric">
                    {t("horizontalDivisions.types.numeric")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </SettingsItem>
    </div>
  );
}
