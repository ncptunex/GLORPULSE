import type { SourceReference } from '../shared/types';

/**
 * Sources used by the prototype (code copy of references.md).
 *
 * 'verified' means the FULL document was read. A search snippet is not enough (FR-SRC-04).
 * Each source is verified only for the narrow claim in `supports` (see references.md, sections 2 to 7).
 * REF-01, REF-02 and REF-03 were read in full. None supports a reference range, threshold or guidance text,
 * so no guidance in this prototype is linked to any of them yet.
 */
export const sources: SourceReference[] = [
  {
    id: 'REF-01',
    title: '5 Hazards of Human Spaceflight',
    organisation: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/hazards/',
    supports: 'The five spaceflight hazards',
    verification: 'verified',
  },
  {
    id: 'REF-02',
    title: 'Space Communications: 7 Things You Need to Know',
    organisation: 'NASA',
    url: 'https://www.nasa.gov/missions/tech-demonstration/space-communications-7-things-you-need-to-know/',
    supports: 'One-way Earth-Mars communication delay of approximately 4 to 24 minutes, depending on planetary distance',
    verification: 'verified',
  },
  {
    id: 'REF-03',
    title: 'Earth-Independent Medical Operations (EIMO) Concept of Operations (ConOps)',
    organisation: 'NASA Human Research Program, Exploration Medical Capability (ExMC) Element',
    url: 'https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf',
    supports:
      'Context (concept presentation): medical care during communication delays where emergency evacuation and terrestrial medical assistance are not available',
    verification: 'verified',
  },
];
