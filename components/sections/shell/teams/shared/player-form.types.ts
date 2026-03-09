import type { ComponentType } from "react";

export type PlayerGender = "male" | "female" | "mixed";
export type PlayerDominantProfile = "right" | "left" | "both";

export interface PlayerFormPositionOption {
  id: string;
  name: string;
  abbreviation: string;
}

export interface PlayerFormPlayerData {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
  photoUrl?: string | null;
  dateOfBirth?: string | null;
  documentNumber?: string | null;
  gender?: PlayerGender | null;
  jerseyNumber?: number | null;
  position?: string | null;
  height?: number | null;
  weight?: number | null;
  country?: string | null;
  cometNumber?: string | null;
  fifaId?: string | null;
  dominantProfile?: PlayerDominantProfile | null;
  categoryId?: string | null;
}

export interface PlayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clubSlug: string;
  positions: PlayerFormPositionOption[];
  player?: PlayerFormPlayerData | null;
}

export type PlayerFormDialogComponent = ComponentType<PlayerFormDialogProps>;
