import type { SportType } from "../types";
import type { SportPageModule } from "./types";
import { basketballSportModule } from "./basketball";
import { soccerSportModule } from "./soccer";

const SPORT_PAGE_MODULES: Record<SportType, SportPageModule> = {
  basketball: basketballSportModule,
  soccer: soccerSportModule,
};

export function getSportPageModule(sportType: SportType): SportPageModule {
  return SPORT_PAGE_MODULES[sportType];
}
