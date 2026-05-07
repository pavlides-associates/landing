export interface Project {
  number: string;
  title: string;
  location: string;
  year: string;
  description: string;
  // Asymmetric column spans on the 12-col desktop grid (each row is 12 cols total)
  span: [number, number];
}

// [TODO: confirm with firm — replace placeholder titles, locations, years, copy]
export const projects: Project[] = [
  {
    number: "01",
    title: "Hellinikon Residence",
    location: "Athens, GR",
    year: "2024",
    description:
      "A coastal house cut into the slope: three terraces, a single concrete spine, courtyards that read the prevailing wind.",
    span: [7, 5],
  },
  {
    number: "02",
    title: "Kifisia Office Block",
    location: "Kifisia, GR",
    year: "2023",
    description:
      "A workplace organised around a continuous timber stair — daylight from above, the city read in long horizontal frames.",
    span: [5, 7],
  },
  {
    number: "03",
    title: "Mykonos Atelier",
    location: "Mykonos, GR",
    year: "2022",
    description:
      "A working studio for a sculptor: thick whitewashed walls, north light, a single covered loggia for the long summer.",
    span: [6, 6],
  },
  {
    number: "04",
    title: "Pelio Stone House",
    location: "Pelion, GR",
    year: "2022",
    description:
      "Restoration and quiet extension of a stone shell, returning the building to its village language with a contemporary plan.",
    span: [8, 4],
  },
  {
    number: "05",
    title: "Civic Library",
    location: "Larissa, GR",
    year: "2021",
    description:
      "A small civic building organised as a single reading room with a generous canopy — public on three sides, calm in the centre.",
    span: [4, 8],
  },
];
