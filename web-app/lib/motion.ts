export const EASE_CINEMATIC: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_ENTRANCE: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_MAGNETIC = {
  type: "spring" as const,
  stiffness: 150,
  damping: 15,
  mass: 0.5,
};
export const EASE_SNAP = { type: "spring" as const, stiffness: 400, damping: 30 };

export const DURATION = {
  instant: 0.15,
  fast: 0.3,
  base: 0.5,
  slow: 0.8,
  cinematic: 1.2,
};

export const STAGGER = {
  tight: 0.05,
  base: 0.08,
  loose: 0.15,
};
