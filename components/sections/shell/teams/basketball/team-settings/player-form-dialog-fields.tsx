"use client";

import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import AvatarUpload from "@/components/ui/avatar-upload";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CountryCombobox } from "@/components/ui/country-combobox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { getDivisionOptions } from "@/lib/basketball/categories";
import { cn } from "@/lib/utils";
import type {
  HorizontalDivisionsConfig,
  LeagueCategoryOption,
  PlayerFormValues,
  PlayerGender,
  PositionOption,
  SetPlayerFormField,
} from "./player-form-dialog.types";

interface PlayerFormDialogFieldsProps {
  ageCategories: LeagueCategoryOption[];
  enabledGenders: PlayerGender[];
  horizontalDivisions: HorizontalDivisionsConfig;
  onDateOfBirthChange: (date: Date | undefined) => void;
  onFileChange: (file: PlayerFormValues["photoFile"]) => void;
  onLeagueCategoryChange: (leagueCategoryId: string) => void;
  positions: PositionOption[];
  setField: SetPlayerFormField;
  values: PlayerFormValues;
}

export function PlayerFormDialogFields({
  ageCategories,
  enabledGenders,
  horizontalDivisions,
  onDateOfBirthChange,
  onFileChange,
  onLeagueCategoryChange,
  positions,
  setField,
  values,
}: PlayerFormDialogFieldsProps) {
  const t = useTranslations("Common");
  const divisionOptions = getDivisionOptions(horizontalDivisions.type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <AvatarUpload
          onFileChange={onFileChange}
          defaultAvatar={values.currentPhotoUrl ?? undefined}
          cropOptions={{
            aspect: 1040 / 760,
            outputWidth: 1040,
            outputHeight: 760,
            cropShape: "rect",
          }}
        />

        <FieldGroup className="w-full flex-1 gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>{t("players.firstName")}</FieldLabel>
              <Input
                value={values.firstName}
                onChange={(event) => setField("firstName", event.target.value)}
                required
                placeholder={t("players.firstName")}
              />
            </Field>

            <Field>
              <FieldLabel>{t("players.lastName")}</FieldLabel>
              <Input
                value={values.lastName}
                onChange={(event) => setField("lastName", event.target.value)}
                required
                placeholder={t("players.lastName")}
              />
            </Field>
          </div>
        </FieldGroup>
      </div>

      <Field>
        <FieldLabel>{t("players.dateOfBirth")}</FieldLabel>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !values.dateOfBirth && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {values.dateOfBirth ? (
                format(values.dateOfBirth, "PPP")
              ) : (
                <span>{t("players.dateOfBirth")}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={values.dateOfBirth}
              onSelect={onDateOfBirthChange}
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

      <FieldGroup>
        <div
          className={cn(
            "grid gap-4 sm:grid-cols-2",
            horizontalDivisions.enabled ? "xl:grid-cols-4" : "xl:grid-cols-3",
          )}
        >
          <Field>
            <FieldLabel>{t("categories.gender")}</FieldLabel>
            <Select
              value={values.gender}
              onValueChange={(value) =>
                setField("gender", value as PlayerFormValues["gender"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("categories.gender")} />
              </SelectTrigger>
              <SelectContent>
                {enabledGenders.map((gender) => (
                  <SelectItem key={gender} value={gender}>
                    {t(`gender.${gender}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel>{t("players.category")}</FieldLabel>
            <Select
              value={values.leagueCategoryId}
              onValueChange={onLeagueCategoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("players.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {ageCategories.length > 0 ? (
                  ageCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.minAge}-{category.maxAge})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-categories" disabled>
                    {t("categories.emptyMessage")}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </Field>

          {horizontalDivisions.enabled && (
            <Field>
              <FieldLabel>{t("categories.horizontalDivision")}</FieldLabel>
              <Select
                value={values.division}
                onValueChange={(value) => setField("division", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("categories.selectDivision")} />
                </SelectTrigger>
                <SelectContent>
                  {divisionOptions.map((division) => (
                    <SelectItem key={division} value={division}>
                      {division}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field>
            <FieldLabel>{t("players.jerseyNumber")}</FieldLabel>
            <Input
              type="number"
              min="0"
              max="99"
              value={values.jerseyNumber}
              onChange={(event) => setField("jerseyNumber", event.target.value)}
              placeholder="#"
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{t("players.position")}</FieldLabel>
            <Select
              value={values.position}
              onValueChange={(value) => setField("position", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("players.selectPosition")} />
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
            <FieldLabel>{t("players.country")}</FieldLabel>
            <CountryCombobox
              value={values.country}
              onValueChange={(value) => setField("country", value)}
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
            <FieldLabel>{t("players.height")}</FieldLabel>
            <Input
              type="number"
              min="100"
              max="250"
              value={values.height}
              onChange={(event) => setField("height", event.target.value)}
              placeholder="cm"
            />
          </Field>

          <Field>
            <FieldLabel>{t("players.weight")}</FieldLabel>
            <Input
              type="number"
              min="30"
              max="200"
              value={values.weight}
              onChange={(event) => setField("weight", event.target.value)}
              placeholder="kg"
            />
          </Field>
        </div>
      </FieldGroup>
    </div>
  );
}
