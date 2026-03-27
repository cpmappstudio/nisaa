export interface PositionOption {
  id: string;
  name: string;
  abbreviation: string;
}

function humanizeRawPosition(value: string): string {
  return value
    .replaceAll("\\", "/")
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word === word.toUpperCase()) {
        return word;
      }
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

export function resolvePlayerPositionLabel(
  positionValue: string | null | undefined,
  positions: PositionOption[] | undefined,
  mode: "abbreviation" | "name" = "abbreviation",
): string | undefined {
  if (!positionValue) {
    return undefined;
  }

  const matched = positions?.find((position) => position.id === positionValue);
  if (matched) {
    return mode === "name" ? matched.name : matched.abbreviation;
  }

  return humanizeRawPosition(positionValue);
}
