import type { AlertLegendEntry } from "../shared/types";

export const alertLegend: AlertLegendEntry[] = [
  {
    level: "info",
    label: "Info",
    description: "Something to be aware of.",
    hasAutomaticTrigger: true,
  },
  {
    level: "watch",
    label: "Watch",
    description:
      "One indicator has stayed away from your baseline for 3 or more days in a row.",
    hasAutomaticTrigger: true,
  },
  {
    level: "action",
    label: "Action",
    description: "An indicator changed and a symptom is logged.",
    hasAutomaticTrigger: true,
  },
  {
    level: "contact-flight-surgeon",
    label: "Contact Flight Surgeon",
    description:
      "Shown for reference only. No automatic trigger in this prototype yet: GLORPULSE never generates this level on its own.",
    hasAutomaticTrigger: false,
  },
];
