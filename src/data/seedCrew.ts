import type { AstronautId, AstronautSeed } from '../shared/types';
import { astro1 } from './crew/astro-1';
import { astro2 } from './crew/astro-2';
import { astro3 } from './crew/astro-3';
import { astro4 } from './crew/astro-4';

/** All simulated astronauts. The first one is the primary story and the default selection. */
export const seedCrew: AstronautSeed[] = [astro1, astro2, astro3, astro4];

/** Finds one astronaut's seed by ID. Throws if the ID is unknown. */
export function getSeed(astronautId: AstronautId): AstronautSeed {
  const seed = seedCrew.find((s) => s.profile.astronautId === astronautId);
  if (!seed) throw new Error(`Unknown astronaut ID: ${astronautId}`);
  return seed;
}
