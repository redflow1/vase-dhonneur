export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PASTEUR"
  | "GDC"
  | "COM"
  | "LOUANGE"
  | "JEUNESSE"
  | "FEMMES"
  | "HOMMES"
  | "INTERCESSION"
  | "ACCUEIL"
  | "EVA"
  | "MRS"
  | "MEMBRE";

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super-Admin",
  ADMIN: "Admin Eglise",
  PASTEUR: "Pasteur",
  GDC: "Gestion du Culte",
  COM: "Communication",
  LOUANGE: "Louange",
  JEUNESSE: "Jeunesse",
  FEMMES: "Femmes",
  HOMMES: "Hommes",
  INTERCESSION: "Intercession",
  ACCUEIL: "Accueil",
  EVA: "EVA",
  MRS: "MRS",
  MEMBRE: "Membre",
};

export interface ModuleItem {
  id: number;
  name: string;
  description: string;
  icon: string;
  path: string;
  roles: Role[];
}

const ALL_ROLES: Role[] = Object.keys(ROLE_LABELS) as Role[];

export const MODULES: ModuleItem[] = [
  {
    id: 1,
    name: "Arbre des Eglises",
    description: "Arbre genealogique du reseau",
    icon: "GitBranch",
    path: "/dashboard/arbre",
    roles: ["SUPER_ADMIN", "PASTEUR"],
  },
  {
    id: 2,
    name: "Gestion des Membres",
    description: "Fiches, presences, anniversaires",
    icon: "Users",
    path: "/dashboard/membres",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR"],
  },
  {
    id: 3,
    name: "Mon Espace",
    description: "Verset, annonces, presences",
    icon: "LayoutDashboard",
    path: "/dashboard/espace",
    roles: ALL_ROLES,
  },
  {
    id: 4,
    name: "Programme du Culte",
    description: "Ordre du service et roles",
    icon: "ClipboardList",
    path: "/dashboard/culte",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR", "GDC"],
  },
  {
    id: 5,
    name: "Setlist & Musiciens",
    description: "Chants, tonalites, planning",
    icon: "Music",
    path: "/dashboard/louange",
    roles: ["SUPER_ADMIN", "LOUANGE"],
  },
  {
    id: 6,
    name: "Communication",
    description: "Annonces, messages, notifications",
    icon: "Megaphone",
    path: "/dashboard/communication",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR", "COM"],
  },
  {
    id: 7,
    name: "Spirituel & Pastoral",
    description: "Priere, temoignages, ressources",
    icon: "Heart",
    path: "/dashboard/spirituel",
    roles: ["SUPER_ADMIN", "PASTEUR", "JEUNESSE", "FEMMES", "HOMMES", "INTERCESSION"],
  },
  {
    id: 8,
    name: "Visiteurs & Convertis",
    description: "Registre, suivi, integration",
    icon: "UserPlus",
    path: "/dashboard/visiteurs",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR", "ACCUEIL", "EVA"],
  },
  {
    id: 9,
    name: "Finances & Dons",
    description: "Dons, offrandes, rapports",
    icon: "Wallet",
    path: "/dashboard/finances",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR"],
  },
  {
    id: 10,
    name: "Evenements & Croisades",
    description: "Retraites, seminaires, inscriptions",
    icon: "Calendar",
    path: "/dashboard/evenements",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR"],
  },
  {
    id: 11,
    name: "Gestion des Salles",
    description: "Reservations et disponibilites",
    icon: "Building2",
    path: "/dashboard/salles",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    id: 12,
    name: "Cellules & Reunions",
    description: "Cellules, presences, comptes-rendus",
    icon: "Network",
    path: "/dashboard/cellules",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR", "JEUNESSE", "FEMMES", "HOMMES", "INTERCESSION", "MRS"],
  },
  {
    id: 13,
    name: "Suivi Pastoral",
    description: "Dossiers confidentiels",
    icon: "Lock",
    path: "/dashboard/pastoral",
    roles: ["PASTEUR"],
  },
  {
    id: 14,
    name: "Certificats",
    description: "Bapteme, mariage, attestations",
    icon: "FileText",
    path: "/dashboard/certificats",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR"],
  },
  {
    id: 15,
    name: "Dashboard Analytique",
    description: "KPIs, graphiques, rapports",
    icon: "BarChart3",
    path: "/dashboard/analytique",
    roles: ["SUPER_ADMIN", "PASTEUR"],
  },
  {
    id: 16,
    name: "Reseau Vases d'Honneur",
    description: "Annuaire, partage, vue globale",
    icon: "Globe",
    path: "/dashboard/reseau",
    roles: ["SUPER_ADMIN", "ADMIN", "PASTEUR"],
  },
  {
    id: 17,
    name: "Gestion des Eglises",
    description: "Creer et gerer les admins d'eglises",
    icon: "Shield",
    path: "/dashboard/admin-management",
    roles: ["SUPER_ADMIN"],
  },
];

export function getModulesForRole(role: Role): ModuleItem[] {
  return MODULES.filter((m) => m.roles.includes(role));
}
