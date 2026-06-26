"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Plus } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Service {
  id: string;
  titre: string;
  date: string;
  theme: string;
  statut: "BROUILLON" | "VALIDE" | "TERMINE";
}

const STATUT_VARIANT: Record<string, "warning" | "success" | "default"> = {
  BROUILLON: "warning",
  VALIDE: "success",
  TERMINE: "default",
};

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  TERMINE: "Terminé",
};

export default function CultePage() {
  const { isLoading: authLoading } = useAuth();
  const { data: culteResponse, loading, error } = useApi<{ data: Service[] }>("/culte");
  const services = culteResponse?.data ?? [];

  const columns = [
    {
      key: "date",
      label: "Date",
      render: (v: string) => (v ? format(parseISO(v), "dd/MM/yyyy") : "—"),
    },
    {
      key: "titre",
      label: "Titre",
      render: (v: string, row: Service) => (
        <Link
          href={`/dashboard/culte/${row.id}`}
          className="font-medium text-teal-deep hover:underline"
        >
          {v}
        </Link>
      ),
    },
    { key: "theme", label: "Thème" },
    {
      key: "statut",
      label: "Statut",
      render: (v: string) => (
        <Badge
          label={STATUT_LABELS[v] ?? v}
          variant={STATUT_VARIANT[v] ?? "default"}
        />
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Programme du Culte"
        subtitle="Gérez les services, ordres du culte et rôles"
        action={
          <Link
            href="/dashboard/culte/nouveau"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
          >
            <Plus size={16} />
            Nouveau service
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <DataTable columns={columns} data={services} loading={loading} />
    </div>
  );
}
