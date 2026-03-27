#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

try:
    from pypdf import PdfReader
except ModuleNotFoundError as exc:
    raise SystemExit(
        "Missing dependency 'pypdf'. Install it with: python3 -m pip install --user pypdf"
    ) from exc


POSITION_RE = re.compile(r"\s+(G|F|C|G/F|F/C|G\\F|F\\C)$", re.IGNORECASE)
CLASS_RE = re.compile(r"(19|20)\d{2}$")
PLAYER_LINE_RE = re.compile(r"^#(?P<jersey>\d+)\s+(?P<rest>.+)$")

TEAM_ACRONYMS = {"DME", "IMG", "HS"}
NAME_ACRONYMS = {"JR", "SR", "II", "III", "IV"}


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def slugify(value: str) -> str:
    normalized = normalize_spaces(value).lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def smart_title_case_word(word: str, acronyms: set[str]) -> str:
    if not word:
        return word

    bare = word.strip("()[]")
    if bare.upper() in acronyms:
        converted = bare.upper()
    else:
        converted = "-".join(
            segment[:1].upper() + segment[1:].lower() if segment else segment
            for segment in bare.split("-")
        )
        converted = "'".join(
            segment[:1].upper() + segment[1:].lower() if segment else segment
            for segment in converted.split("'")
        )

    prefix = word[: len(word) - len(word.lstrip("(["))]
    suffix = word[len(word.rstrip(")]")) :]
    return f"{prefix}{converted}{suffix}"


def smart_title_case(value: str, acronyms: set[str]) -> str:
    return " ".join(
        smart_title_case_word(part, acronyms)
        for part in normalize_spaces(value).split(" ")
    )


def clean_team_name(header: str) -> str:
    cleaned = header.replace("[", " ").replace("]", " ")
    cleaned = re.sub(r"\bGIRLS\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bBASKETBALL\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\bROSTER\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = normalize_spaces(cleaned)
    return smart_title_case(cleaned, TEAM_ACRONYMS)


def clean_player_name(name: str) -> str:
    cleaned = name
    cleaned = re.sub(r"\)\s*(?=[A-Za-z])", ") ", cleaned)
    cleaned = normalize_spaces(cleaned)
    return smart_title_case(cleaned, NAME_ACRONYMS)


def split_pdf_lines(pdf_path: Path) -> list[str]:
    reader = PdfReader(str(pdf_path))
    raw_text = "\n".join((page.extract_text() or "") for page in reader.pages)
    return [
        normalize_spaces(line)
        for line in raw_text.splitlines()
        if normalize_spaces(line)
    ]


def parse_player_line(line: str) -> dict[str, object] | None:
    match = PLAYER_LINE_RE.match(line)
    if not match:
        return None

    jersey = int(match.group("jersey"))
    rest = normalize_spaces(match.group("rest"))

    # Repair malformed rows like "#32 #12 DIANA MARCHESI 2027".
    rest = re.sub(r"^#\d+\s+", "", rest)

    raw_position = None
    position_match = POSITION_RE.search(rest)
    if position_match:
        raw_position = position_match.group(1).replace("\\", "/").upper()
        rest = normalize_spaces(rest[: position_match.start()])

    class_match = CLASS_RE.search(rest)
    if class_match:
        rest = normalize_spaces(rest[: class_match.start()])
    else:
        inline_class_match = re.search(r"(?<=[A-Za-z\)])((19|20)\d{2})$", rest)
        if inline_class_match:
            rest = normalize_spaces(rest[: inline_class_match.start()])

    full_name = clean_player_name(rest)
    if not full_name:
        return None

    return {
        "fullName": full_name,
        "jerseyNumber": jersey,
        "rawPosition": raw_position,
        "sourceLine": line,
    }


def parse_roster(pdf_path: Path) -> dict[str, object]:
    lines = split_pdf_lines(pdf_path)
    if not lines:
        raise ValueError(f"No text extracted from {pdf_path}")

    header = lines[0]
    coach_line = next(
        (line for line in lines if line.upper().startswith("COACH ")),
        None,
    )
    coach_name = coach_line[6:].strip() if coach_line else None

    players: list[dict[str, object]] = []
    for line in lines[1:]:
        if line.upper().startswith("COACH ") or re.fullmatch(
            r"\d+\s+of\s+\d+",
            line,
            flags=re.IGNORECASE,
        ):
            continue
        player = parse_player_line(line)
        if player is not None:
            players.append(player)

    team_name = clean_team_name(header)
    if not team_name:
        raise ValueError(f"Could not derive a team name from {pdf_path.name}")

    return {
        "sourceFile": pdf_path.name,
        "sourceHeader": header,
        "teamName": team_name,
        "slug": slugify(team_name),
        "coachName": (
            smart_title_case(coach_name, NAME_ACRONYMS) if coach_name else None
        ),
        "players": players,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="public/data")
    parser.add_argument("--only", action="append", default=[])
    args = parser.parse_args()

    data_dir = Path(args.dir)
    if not data_dir.exists():
        raise SystemExit(f"Directory not found: {data_dir}")

    pdf_paths = sorted(data_dir.glob("*.pdf"))
    filters = [value.lower() for value in args.only]
    if filters:
        pdf_paths = [
            path
            for path in pdf_paths
            if any(token in path.name.lower() for token in filters)
        ]

    payload = {
        "count": len(pdf_paths),
        "teams": [parse_roster(pdf_path) for pdf_path in pdf_paths],
    }
    json.dump(payload, sys.stdout, ensure_ascii=False)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
