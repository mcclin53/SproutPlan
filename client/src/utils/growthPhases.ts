export type GrowthPhase = "seed" | "vegetative" | "flowering" | "fruiting" | "dead";

export interface PhaseTiming {
  germinationDays?: number;
  floweringDays?: number;
  fruitingDays?: number;
  lifespanDays?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function computePhase(
  plantedAt: Date,
  simulatedDate: Date,
  timing: PhaseTiming
): {
  ageDays: number;
  phase: GrowthPhase;
  daysIntoPhase: number;
} {
  const {
    germinationDays = 0,
    floweringDays,
    fruitingDays,
    lifespanDays,
  } = timing;

  const ageDays = Math.max(
    0,
    Math.floor((simulatedDate.getTime() - plantedAt.getTime()) / MS_PER_DAY)
  );

  let phase: GrowthPhase = "vegetative";
  let phaseStart = 0;

  // Seed phase: before germination
  if (ageDays < germinationDays) {
    phase = "seed";
    phaseStart = 0;
  } else if (
    floweringDays !== undefined &&
    ageDays >= floweringDays &&
    (fruitingDays === undefined || ageDays < fruitingDays)
  ) {
    // Flowering window
    phase = "flowering";
    phaseStart = floweringDays;
  } else if (
    fruitingDays !== undefined &&
    ageDays >= fruitingDays &&
    (lifespanDays === undefined || ageDays < lifespanDays)
  ) {
    // Fruiting window
    phase = "fruiting";
    phaseStart = fruitingDays;
  } else if (lifespanDays !== undefined && ageDays >= lifespanDays) {
    // Old age → dead
    phase = "dead";
    phaseStart = lifespanDays;
  } else {
    // Vegetative phase: post-germination and pre-flowering
    phase = "vegetative";
    phaseStart = germinationDays;
  }

  const daysIntoPhase = Math.max(0, ageDays - phaseStart);
  return { ageDays, phase, daysIntoPhase };
}
