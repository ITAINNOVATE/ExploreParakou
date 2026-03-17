"use strict";

import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FlaskConical,
  Stethoscope,
  Baby,
  Pill,
  Package,
  FileText,
  Settings,
  ShieldCheck,
  CreditCard,
  History,
  DollarSign,
  Receipt,
  Wallet,
  PieChart,
  Tag,
  Shield,
  Microscope,
  Stethoscope as StethoscopeIcon,
  ShoppingBag,
  BriefcaseMedical
} from "lucide-react";

export const sidebarItems = [
  {
    title: "Tableau de Bord",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Patients",
    icon: Users,
    href: "/dashboard/patients",
  },
  {
    title: "Rendez-vous",
    icon: Calendar,
    href: "/dashboard/appointments",
  },
  {
    title: "Consultations",
    icon: ClipboardList,
    href: "/dashboard/consultations",
  },
  {
    title: "Laboratoire",
    icon: FlaskConical,
    href: "/dashboard/lab",
  },
  {
    title: "Imagerie Médicale",
    icon: Stethoscope,
    href: "/dashboard/imaging",
  },
  {
    title: "Maternité",
    icon: Baby,
    href: "/dashboard/maternity",
  },
  {
    title: "Pharmacie",
    icon: Pill,
    href: "/dashboard/pharmacy",
  },
  {
    title: "Magasin Central",
    icon: Package,
    href: "/dashboard/inventory",
  },
  {
    title: "Finances",
    icon: DollarSign,
    href: "/dashboard/finance",
    group: "finance",
  },
  {
    title: "Actes médicaux",
    icon: BriefcaseMedical,
    href: "/dashboard/finance/pricing/medical-acts",
    group: "pricing",
  },
  {
    title: "Analyses Laboratoire",
    icon: Microscope,
    href: "/dashboard/finance/pricing/lab",
    group: "pricing",
  },
  {
    title: "Imagerie Médicale",
    icon: StethoscopeIcon,
    href: "/dashboard/finance/pricing/imaging",
    group: "pricing",
  },
  {
    title: "Médicaments",
    icon: ShoppingBag,
    href: "/dashboard/finance/pricing/medicines",
    group: "pricing",
  },
  {
    title: "Assurances",
    icon: Shield,
    href: "/dashboard/finance/pricing/insurances",
    group: "pricing",
  },
  {
    title: "Factures",
    icon: Receipt,
    href: "/dashboard/finance/billing",
    group: "finance",
  },
  {
    title: "Caisse",
    icon: Wallet,
    href: "/dashboard/finance/payments",
    group: "finance",
  },
  {
    title: "Rapports Financiers",
    icon: PieChart,
    href: "/dashboard/finance/reports",
    group: "finance",
  },
  {
    title: "Paramètres",
    icon: Settings,
    href: "/dashboard/settings",
  },
  {
    title: "Super Admin",
    icon: ShieldCheck,
    href: "/dashboard/admin",
    role: "Super Admin",
  },
];
