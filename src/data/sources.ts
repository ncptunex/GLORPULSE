import type { SourceReference } from '../shared/types';

/**
 * Sources used by the prototype (code copy of references.md, which is still to be created).
 *
 * 'verified' means the FULL document was read. A search snippet is not enough (FR-SRC-04).
 * REF-02 is marked verified because product.md records "Page read in full".
 * REF-01 and REF-03 were only seen in search results, so they stay 'not-yet-verified'.
 *
 * Because of that, no guidance in this prototype is linked to REF-01 or REF-03 yet.
 */
export const sources: SourceReference[] = [
  {
    id: 'REF-01',
    title: '5 Hazards of Human Spaceflight',
    organisation: 'NASA Human Research Program',
    url: 'https://www.nasa.gov/hrp/hazards/',
    supports: 'The five spaceflight hazards',
    verification: 'not-yet-verified',
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
    title: 'Earth-Independent Medical Operations (EIMO) Concept of Operations',
    organisation: 'NASA Exploration Medical Capability',
    url: 'https://ntrs.nasa.gov/api/citations/20240001402/downloads/2024_IWS_EIMO_ConOps_FINAL.pdf',
    supports: 'Context: medical care during communication delays where evacuation is not available',
    verification: 'not-yet-verified',
  },
];
