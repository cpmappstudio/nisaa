import type { FileWithPreview } from "@/lib/files/upload";
import type {
  DivisionType,
  LeagueAgeCategory,
} from "@/lib/basketball/categories";

export type PlayerGender = "male" | "female" | "mixed";

export interface PlayerData {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  jerseyNumber?: number | null;
  position?: string | null;
  height?: number | null;
  weight?: number | null;
  country?: string | null;
  categoryId?: string | null;
  categoryLeagueCategoryId?: string | null;
  categoryName?: string | null;
  categoryAgeGroup?: string | null;
  categoryGender?: PlayerGender | null;
}

export interface PositionOption {
  id: string;
  name: string;
  abbreviation: string;
}

export type LeagueCategoryOption = LeagueAgeCategory;

export interface HorizontalDivisionsConfig {
  enabled: boolean;
  type: DivisionType;
}

export interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
  ageCategories: LeagueCategoryOption[];
  enabledGenders: PlayerGender[];
  horizontalDivisions: HorizontalDivisionsConfig;
  positions: PositionOption[];
  player?: PlayerData | null;
}

export interface PlayerFormValues {
  firstName: string;
  lastName: string;
  dateOfBirth: Date | undefined;
  gender: PlayerGender | "";
  jerseyNumber: string;
  position: string;
  height: string;
  weight: string;
  country: string;
  leagueCategoryId: string;
  division: string;
  photoFile: FileWithPreview | null;
  currentPhotoUrl: string | null;
}

export type SetPlayerFormField = <K extends keyof PlayerFormValues>(
  field: K,
  value: PlayerFormValues[K],
) => void;
