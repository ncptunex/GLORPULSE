import type { AlertLegendEntry } from '../shared/types';

/**
 * The four alert levels shown in the legend.
 * Contact Flight Surgeon has no automatic trigger until decision D-10 is made (FR-ALERT-06).
 */
export const alertLegend: AlertLegendEntry[] = [
  {
    level: 'info',
    label: 'Info',
    description: 'Something to be aware of. Not yet a sustained change from your baseline.',
    hasAutomaticTrigger: true,
  },
  {
    level: 'watch',
    label: 'Watch',
    description: 'One indicator has stayed away from your baseline for 3 or more days in a row.',
    hasAutomaticTrigger: true,
  },
  {
    level: 'action',
    label: 'Action',
    description: 'A sustained change together with a second indicator or a logged symptom.',
    hasAutomaticTrigger: true,
  },
  {
    level: 'contact-flight-surgeon',
    label: 'Contact Flight Surgeon',
    description: 'No automatic trigger in this prototype yet.',
    hasAutomaticTrigger: false,
  },
];
