/**
 * URL hash deep links.
 *
 *   #year=1066&conflict=hastings-battle
 *   #year=1200&empire=mongol-empire
 *
 * `conflict` and `empire` are mutually exclusive (one right-side panel at a
 * time); when both are present `conflict` wins. Parsing is tolerant — the
 * hash may carry unknown keys, and a missing `year` is null.
 */
export interface HashState {
  year: number | null;
  conflictId: string | null;
  empireId: string | null;
}

export function parseHash(hash: string): HashState {
  const yearMatch = hash.match(/(?:^#|[#&?])year=(-?\d+)/);
  const conflictMatch = hash.match(/(?:^#|[#&?])conflict=([\w\-.~%]+)/);
  const empireMatch = hash.match(/(?:^#|[#&?])empire=([\w\-.~%]+)/);
  const conflictId = conflictMatch ? safeDecode(conflictMatch[1]) : null;
  return {
    year: yearMatch ? parseInt(yearMatch[1], 10) : null,
    conflictId,
    empireId: !conflictId && empireMatch ? safeDecode(empireMatch[1]) : null,
  };
}

export function buildHash(
  year: number,
  conflictId?: string | null,
  empireId?: string | null,
): string {
  let h = `#year=${Math.round(year)}`;
  if (conflictId) h += `&conflict=${encodeURIComponent(conflictId)}`;
  else if (empireId) h += `&empire=${encodeURIComponent(empireId)}`;
  return h;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
