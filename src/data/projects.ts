export interface Project {
  number: string;
  category: string;
  title: string;
  url: string;
}

export const projects: Project[] = [
  {
    number: "01",
    category: "Εκπαιδευτικό",
    title: "Γυμνάσιο – Λύκειο Ελληνογερμανικής Αγωγής",
    url: "https://grafpa.gr/gumnasio-lukeio-ellinogermaniki-agogi/",
  },
  {
    number: "02",
    category: "Υγεία",
    title: "Κέντρο Αποκατάστασης Ωρωπού",
    url: "https://grafpa.gr/kentro-apotherapeias-kai-apokatastasis-ston-oropo/",
  },
  {
    number: "03",
    category: "Κατοικία",
    title: "Πρεσβευτική Κατοικία Κουβέιτ",
    url: "https://grafpa.gr/presbeftiki-katoikia-koubeit/",
  },
  {
    number: "04",
    category: "Αστική Ανάπλαση",
    title: "Ανάπλαση Πλατείας Κουμουνδούρου",
    url: "https://grafpa.gr/anaplasi-plateias-koumoundourou/",
  },
  {
    number: "05",
    category: "Βιομηχανικό",
    title: "Κεντρικά Γραφεία ΕΔΡΑΣΗ ΑΤΕ",
    url: "https://grafpa.gr/kentrika-grafeia-edrasi-ate/",
  },
];
