"use client";

import { FormEvent, useState, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LocationPicker } from "@/components/sections/shell/games/shared/location-picker";
import {
  AlertCircle,
  ArrowLeft,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Clock2Icon,
  Trophy,
  Zap,
} from "lucide-react";

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { FieldLabel } from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/utils";

type Gender = "male" | "female" | "mixed";
type GameType = "quick" | "season" | "tournament" | null;

interface Club {
  _id: string;
  name: string;
  nickname: string;
  status: "affiliated" | "invited" | "suspended";
  logoUrl?: string;
}

function TeamLogo({ club, size = 20 }: { club: Club; size?: number }) {
  if (club.logoUrl) {
    return (
      <Image
        src={club.logoUrl}
        alt={club.name}
        width={size}
        height={size}
        className="rounded-full object-contain"
      />
    );
  }

  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
    >
      {club.name.charAt(0).toUpperCase()}
    </div>
  );
}

interface CreateGameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgSlug: string;
  preselectedClubId?: string;
}

interface GameFormState {
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: Date | undefined;
  startTime: string;
  category: string;
  gender: Gender;
  locationName: string;
  locationCoordinates: [number, number] | null;
}

const INITIAL_FORM_STATE: GameFormState = {
  seasonId: "",
  homeTeamId: "",
  awayTeamId: "",
  date: undefined,
  startTime: "10:00",
  category: "",
  gender: "male",
  locationName: "",
  locationCoordinates: null,
};

export function CreateGameDialog({
  open,
  onOpenChange,
  orgSlug,
  preselectedClubId,
}: CreateGameDialogProps) {
  const t = useTranslations("Common");

  const teamConfig = useQuery(api.leagueSettings.getTeamConfig, {
    leagueSlug: orgSlug,
  });
  const clubs = useQuery(api.clubs.listByLeague, {
    orgSlug,
  });
  const activeSeasons = useQuery(api.leagueSettings.listActiveSeasons, {
    leagueSlug: orgSlug,
  });

  const createGame = useMutation(api.games.create);

  const initialFormState: GameFormState = {
    ...INITIAL_FORM_STATE,
    homeTeamId: preselectedClubId || "",
  };

  const [gameType, setGameType] = useState<GameType>(null);
  const [formState, setFormState] = useState<GameFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasPreselectedClub = Boolean(preselectedClubId);

  // Get the list of club IDs to check for category
  const clubIdsToCheck = useMemo(() => {
    const ids: Id<"clubs">[] = [];
    if (formState.homeTeamId) {
      ids.push(formState.homeTeamId as Id<"clubs">);
    }
    if (formState.awayTeamId) {
      ids.push(formState.awayTeamId as Id<"clubs">);
    }
    return ids;
  }, [formState.homeTeamId, formState.awayTeamId]);

  // Check if selected clubs have the selected category
  const categoryCheck = useQuery(
    api.categories.checkClubsHaveCategory,
    clubIdsToCheck.length > 0 && formState.category && formState.gender
      ? {
          clubIds: clubIdsToCheck,
          ageGroup: formState.category,
          gender: formState.gender,
        }
      : "skip",
  );

  // Derive validation state from the query results
  const categoryValidation = useMemo(() => {
    if (
      !formState.category ||
      !formState.gender ||
      clubIdsToCheck.length === 0 ||
      !categoryCheck
    ) {
      return { isValid: true, missingTeams: [] as string[] };
    }

    const missingTeams = categoryCheck
      .filter((r) => !r.hasCategory)
      .map((r) => r.clubName);

    return {
      isValid: missingTeams.length === 0,
      missingTeams,
    };
  }, [formState.category, formState.gender, clubIdsToCheck, categoryCheck]);

  const ageCategories: {
    id: string;
    name: string;
    minAge: number;
    maxAge: number;
  }[] = teamConfig?.ageCategories || [];
  const enabledGenders = (teamConfig?.enabledGenders as Gender[]) || [
    "male",
    "female",
  ];
  const hasActiveSeasons = (activeSeasons?.length ?? 0) > 0;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setGameType(null);
      setFormState(initialFormState);
    }
    onOpenChange(newOpen);
  };

  const handleBack = () => {
    setGameType(null);
    setFormState(initialFormState);
  };

  const updateField = <K extends keyof GameFormState>(
    field: K,
    value: GameFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      !formState.homeTeamId ||
      !formState.awayTeamId ||
      !formState.date ||
      !formState.startTime ||
      !formState.category ||
      !formState.gender
    ) {
      return;
    }

    if (formState.homeTeamId === formState.awayTeamId) {
      return;
    }

    if (gameType === "season" && !formState.seasonId) {
      return;
    }

    setIsSubmitting(true);
    try {
      const dateString = format(formState.date, "yyyy-MM-dd");

      await createGame({
        orgSlug,
        seasonId: gameType === "season" ? formState.seasonId : undefined,
        homeClubId: formState.homeTeamId as Id<"clubs">,
        awayClubId: formState.awayTeamId as Id<"clubs">,
        date: dateString,
        startTime: formState.startTime,
        category: formState.category,
        gender: formState.gender,
        locationName: formState.locationName || undefined,
        locationCoordinates: formState.locationCoordinates || undefined,
      });

      setFormState(initialFormState);
      setGameType(null);
      onOpenChange(false);
    } catch (error) {
      console.error("[CreateGameDialog] Failed to create game:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const affiliatedClubs = (clubs || []).filter(
    (club) => club.status === "affiliated",
  );
  const preselectedClub = hasPreselectedClub
    ? (clubs || []).find((club) => club._id === preselectedClubId)
    : null;
  const isPreselectedClubAffiliated =
    !hasPreselectedClub || preselectedClub?.status === "affiliated";

  const isFormValid =
    (gameType !== "season" || formState.seasonId) &&
    formState.homeTeamId &&
    formState.awayTeamId &&
    formState.homeTeamId !== formState.awayTeamId &&
    formState.date &&
    formState.startTime &&
    formState.category &&
    formState.gender &&
    categoryValidation.isValid &&
    isPreselectedClubAffiliated;

  const availableAwayTeams = affiliatedClubs.filter(
    (club) => club._id !== formState.homeTeamId,
  );

  const availableHomeTeams = affiliatedClubs.filter(
    (club) => club._id !== formState.awayTeamId,
  );
  const selectedSeason = (activeSeasons || []).find(
    (season) => season.id === formState.seasonId,
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {gameType === null ? (
          <>
            <DialogHeader className="px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle className="text-left">
                {t("games.createTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
              <div className="flex flex-col gap-4">
                <Button
                  variant="outline"
                  className="h-auto w-full items-start justify-start gap-3 px-4 py-4 whitespace-normal"
                  onClick={() => setGameType("quick")}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-medium">{t("games.quickGame")}</div>
                    <div className="text-sm text-muted-foreground whitespace-normal break-words">
                      {t("games.quickGameDescription")}
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className={cn(
                    "h-auto w-full items-start justify-start gap-3 px-4 py-4 whitespace-normal",
                    !hasActiveSeasons && "cursor-not-allowed opacity-50",
                  )}
                  onClick={() => setGameType("season")}
                  disabled={!hasActiveSeasons}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                      hasActiveSeasons ? "bg-primary/10" : "bg-muted",
                    )}
                  >
                    <CalendarIcon
                      className={cn(
                        "h-5 w-5",
                        hasActiveSeasons
                          ? "text-primary"
                          : "text-muted-foreground",
                      )}
                    />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-medium">{t("games.seasonGame")}</div>
                    <div className="text-sm text-muted-foreground whitespace-normal break-words">
                      {hasActiveSeasons
                        ? t("games.seasonGameDescription")
                        : t("games.noActiveSeasons")}
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto w-full cursor-not-allowed items-start justify-start gap-3 px-4 py-4 opacity-50 whitespace-normal"
                  disabled
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Trophy className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="font-medium">{t("games.tournament")}</div>
                    <div className="text-sm text-muted-foreground whitespace-normal break-words">
                      {t("games.tournamentDescription")}
                    </div>
                  </div>
                </Button>
              </div>
            </div>

            <DialogFooter className="border-t px-4 py-3 sm:px-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                {t("actions.cancel")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="border-b px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <DialogTitle className="text-left">
                  {gameType === "season"
                    ? t("games.seasonGame")
                    : t("games.quickGame")}
                </DialogTitle>
              </div>
            </DialogHeader>

            <form
              onSubmit={handleSubmit}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{t("games.homeTeam")}</FieldLabel>
                      {hasPreselectedClub ? (
                        <Button
                          variant="outline"
                          disabled
                          className="mt-2 w-full min-w-0 cursor-not-allowed justify-start"
                        >
                          {(() => {
                            const preselectedClub = (clubs || []).find(
                              (c) => c._id === preselectedClubId,
                            );
                            return preselectedClub ? (
                              <span className="flex min-w-0 items-center gap-2">
                                <TeamLogo club={preselectedClub} />
                                <span className="truncate">
                                  {preselectedClub.name}
                                </span>
                              </span>
                            ) : (
                              t("actions.loading")
                            );
                          })()}
                        </Button>
                      ) : (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "mt-2 w-full min-w-0 justify-between",
                                !formState.homeTeamId &&
                                  "text-muted-foreground",
                              )}
                            >
                              {formState.homeTeamId ? (
                                <span className="flex min-w-0 items-center gap-2">
                                  <TeamLogo
                                    club={
                                      availableHomeTeams.find(
                                        (c) => c._id === formState.homeTeamId,
                                      )!
                                    }
                                  />
                                  <span className="truncate">
                                    {
                                      availableHomeTeams.find(
                                        (c) => c._id === formState.homeTeamId,
                                      )?.name
                                    }
                                  </span>
                                </span>
                              ) : (
                                t("games.selectTeam")
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder={t("actions.search")} />
                              <CommandList>
                                <CommandEmpty>
                                  {t("table.noResults")}
                                </CommandEmpty>
                                <CommandGroup>
                                  {availableHomeTeams.map((club) => (
                                    <CommandItem
                                      key={club._id}
                                      value={club.name}
                                      onSelect={() => {
                                        updateField("homeTeamId", club._id);
                                      }}
                                    >
                                      <TeamLogo club={club} />
                                      <span className="ml-2">{club.name}</span>
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          formState.homeTeamId === club._id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    <div>
                      <FieldLabel>{t("games.awayTeam")}</FieldLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "mt-2 w-full min-w-0 justify-between",
                              !formState.awayTeamId && "text-muted-foreground",
                            )}
                          >
                            {formState.awayTeamId ? (
                              <span className="flex min-w-0 items-center gap-2">
                                <TeamLogo
                                  club={
                                    availableAwayTeams.find(
                                      (c) => c._id === formState.awayTeamId,
                                    )!
                                  }
                                />
                                <span className="truncate">
                                  {
                                    availableAwayTeams.find(
                                      (c) => c._id === formState.awayTeamId,
                                    )?.name
                                  }
                                </span>
                              </span>
                            ) : (
                              t("games.selectTeam")
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder={t("actions.search")} />
                            <CommandList>
                              <CommandEmpty>
                                {t("table.noResults")}
                              </CommandEmpty>
                              <CommandGroup>
                                {availableAwayTeams.map((club) => (
                                  <CommandItem
                                    key={club._id}
                                    value={club.name}
                                    onSelect={() => {
                                      updateField("awayTeamId", club._id);
                                    }}
                                  >
                                    <TeamLogo club={club} />
                                    <span className="ml-2">{club.name}</span>
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        formState.awayTeamId === club._id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {hasPreselectedClub && !isPreselectedClubAffiliated && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{t("games.clubStatusNotEligible")}</p>
                    </div>
                  )}

                  {gameType === "season" && (
                    <div>
                      <FieldLabel>{t("games.season")}</FieldLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!hasActiveSeasons}
                            className={cn(
                              "mt-2 w-full min-w-0 justify-between",
                              !formState.seasonId && "text-muted-foreground",
                            )}
                          >
                            {formState.seasonId && selectedSeason ? (
                              <span className="truncate">
                                {selectedSeason.name}
                              </span>
                            ) : hasActiveSeasons ? (
                              t("games.selectSeason")
                            ) : (
                              t("games.noActiveSeasons")
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[--radix-popover-trigger-width] p-0"
                          align="start"
                        >
                          <Command>
                            <CommandInput placeholder={t("actions.search")} />
                            <CommandList>
                              <CommandEmpty>
                                {t("table.noResults")}
                              </CommandEmpty>
                              <CommandGroup>
                                {(activeSeasons || []).map((season) => (
                                  <CommandItem
                                    key={season.id}
                                    value={season.name}
                                    onSelect={() => {
                                      updateField("seasonId", season.id);
                                    }}
                                  >
                                    <div className="flex min-w-0 flex-1 flex-col">
                                      <span className="truncate font-medium">
                                        {season.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        {season.startDate} - {season.endDate}
                                      </span>
                                    </div>
                                    <Check
                                      className={cn(
                                        "ml-auto h-4 w-4",
                                        formState.seasonId === season.id
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div>
                    <FieldLabel>{t("games.dateTime")}</FieldLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "mt-2 w-full justify-start text-left font-normal",
                            !formState.date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formState.date
                            ? `${format(formState.date, "PPP")} · ${formState.startTime}`
                            : t("games.selectDateTime")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formState.date}
                          onSelect={(date: Date | undefined) =>
                            updateField("date", date)
                          }
                        />
                        <div className="border-t p-3">
                          <FieldLabel htmlFor="time-from">
                            {t("games.startTime")}
                          </FieldLabel>
                          <InputGroup className="mt-1.5">
                            <InputGroupInput
                              id="time-from"
                              type="time"
                              value={formState.startTime}
                              onChange={(e) =>
                                updateField("startTime", e.target.value)
                              }
                              className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                            />
                            <InputGroupAddon>
                              <Clock2Icon className="text-muted-foreground" />
                            </InputGroupAddon>
                          </InputGroup>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel>{t("games.category")}</FieldLabel>
                      <Select
                        value={formState.category}
                        onValueChange={(value) =>
                          updateField("category", value)
                        }
                      >
                        <SelectTrigger className="mt-2 w-full">
                          <SelectValue
                            placeholder={t("games.selectCategory")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {ageCategories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name} ({cat.minAge}-{cat.maxAge})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <FieldLabel>{t("games.gender")}</FieldLabel>
                      <Select
                        value={formState.gender}
                        onValueChange={(value) =>
                          updateField("gender", value as Gender)
                        }
                      >
                        <SelectTrigger className="mt-2 w-full">
                          <SelectValue placeholder={t("games.gender")} />
                        </SelectTrigger>
                        <SelectContent>
                          {enabledGenders.map((gender) => (
                            <SelectItem key={gender} value={gender}>
                              {t(`gender.${gender}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {!categoryValidation.isValid &&
                    categoryValidation.missingTeams.length > 0 && (
                      <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="font-medium">
                            {t("games.categoryValidationError")}
                          </p>
                          <p className="mt-1">
                            {t("games.teamsMissingCategory", {
                              teams: categoryValidation.missingTeams.join(", "),
                              category: formState.category,
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                  <div>
                    <FieldLabel>{t("games.location")}</FieldLabel>
                    <div className="mt-2 h-48 overflow-hidden rounded-md border">
                      <LocationPicker
                        onLocationChange={(location) => {
                          if (location) {
                            updateField(
                              "locationCoordinates",
                              location.position as [number, number],
                            );
                            updateField("locationName", location.name);
                          }
                        }}
                      />
                    </div>
                  </div>
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
                <Button type="submit" disabled={isSubmitting || !isFormValid}>
                  {isSubmitting ? t("actions.loading") : t("actions.create")}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
