interface PlayerNameLike {
  firstName?: string | null;
  lastName?: string | null;
  secondLastName?: string | null;
}

function compactNamePart(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getPlayerLastNames(player: PlayerNameLike) {
  return [compactNamePart(player.lastName), compactNamePart(player.secondLastName)]
    .filter(Boolean)
    .join(" ");
}

export function getPlayerFullName(player: PlayerNameLike) {
  return [compactNamePart(player.firstName), getPlayerLastNames(player)]
    .filter(Boolean)
    .join(" ");
}

export function getPlayerInitials(player: PlayerNameLike) {
  const firstInitial = compactNamePart(player.firstName)?.charAt(0) ?? "";
  const lastNames = getPlayerLastNames(player);
  const lastInitial = lastNames.charAt(0);
  return `${firstInitial}${lastInitial}`.toUpperCase();
}
