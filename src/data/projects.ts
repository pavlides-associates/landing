export interface Project {
  number: string;
  category: string;
  title: string;
  url: string;
}

// [TODO: αντικατάσταση των URL με τις τελικές σελίδες έργου στο grafpa.gr]
export const projects: Project[] = [
  {
    number: "01",
    category: "Εκπαιδευτικό",
    title: "Γυμνάσιο – Λύκειο Ελληνογερμανικής Αγωγής",
    url: "https://grafpa.gr/",
  },
  {
    number: "02",
    category: "Υγεία",
    title: "Κέντρο Αποκατάστασης Ωρωπού",
    url: "https://grafpa.gr/",
  },
  {
    number: "03",
    category: "Κατοικία",
    title: "Πρεσβευτική Κατοικία Κουβέιτ",
    url: "https://grafpa.gr/",
  },
  {
    number: "04",
    category: "Αστική Ανάπλαση",
    title: "Ανάπλαση Πλατείας Κουμουνδούρου",
    url: "https://grafpa.gr/",
  },
  {
    number: "05",
    category: "Βιομηχανικό",
    title: "Κεντρικά Γραφεία ΕΔΡΑΣΗ ΑΤΕ",
    url: "https://grafpa.gr/",
  },
];
