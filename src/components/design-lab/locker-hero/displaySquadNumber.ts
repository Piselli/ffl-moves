/**
 * FPL `squad_number` is often null early in a season.
 * Stable fallback keyed by FPL photo `code` (fplPhotoCode) for live kit labels.
 * Real API values always win when present.
 */

const BY_PHOTO_CODE: Record<number, number> = {
  // Arsenal
  154561: 1, // Raya
  462424: 2, // Saliba
  226597: 6, // Gabriel
  445122: 12, // J.Timber
  466075: 33, // Calafiori
  198869: 4, // White
  204480: 41, // Rice
  184029: 8, // Ødegaard
  223340: 7, // Saka
  219847: 29, // Havertz
  // Man City
  223094: 9, // Haaland
  209244: 47, // Foden
  // Liverpool
  116535: 1, // A.Becker
  97032: 4, // Virgil
  219168: 9, // Isak
  424876: 8, // Szoboszlai
  243016: 10, // Mac Allister
  243298: 18, // Gakpo
  // Chelsea
  244851: 20, // Palmer
  // Newcastle
  208706: 39, // Bruno G.
  // Man Utd
  141746: 8, // B.Fernandes
  // Everton
  111234: 1, // Pickford
  // Aston Villa
  178301: 11, // Watkins
  // Spurs
  154566: 19, // Solanke
  212319: 9, // Richarlison
};

/** Display shirt number: live FPL value, else known fallback. */
export function displaySquadNumber(player: {
  squadNumber?: number | null;
  fplPhotoCode?: number | null;
}): number | null {
  if (player.squadNumber != null && Number.isFinite(player.squadNumber)) {
    return Number(player.squadNumber);
  }
  const code = player.fplPhotoCode;
  if (code != null && BY_PHOTO_CODE[code] != null) {
    return BY_PHOTO_CODE[code];
  }
  return null;
}
