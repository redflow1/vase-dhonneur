"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch, getToken } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import SearchInput from "@/components/ui/SearchInput";
import MemberAvatar from "@/components/MemberAvatar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Users, Download, Plus, Cake } from "lucide-react";
import { format, isWithinInterval, addDays, parseISO } from "date-fns";

interface Membre {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  isActive: boolean;
  birthDate?: string;
  photoUrl?: string;
  address?: string;
  createdAt?: string;
}

const TABS = ["Liste", "Anniversaires", "Carte"];

const STATUT_VARIANT: Record<string, "success" | "warning" | "default" | "danger"> = {
  ACTIF: "success",
  INACTIF: "default",
  SUSPENDU: "danger",
};

export default function MembresPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: membresResponse, loading, error, refetch } = useApi<{ data: Membre[]; pagination?: unknown }>("/membres");
  const membres = membresResponse?.data ?? [];
  const [tab, setTab] = useState("Liste");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const filtered = useMemo(() => {
    if (!membres) return [];
    const q = search.toLowerCase();
    if (!q) return membres;
    return membres.filter(
      (m) =>
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        (m.department || "").toLowerCase().includes(q)
    );
  }, [membres, search]);

  const upcomingBirthdays = useMemo(() => {
    if (!membres) return [];
    const today = new Date();
    const end = addDays(today, 30);
    return membres.filter((m) => {
      if (!m.birthDate) return false;
      try {
        const dob = parseISO(m.birthDate);
        const thisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        const nextYear = new Date(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
        return (
          isWithinInterval(thisYear, { start: today, end }) ||
          isWithinInterval(nextYear, { start: today, end })
        );
      } catch {
        return false;
      }
    });
  }, [membres]);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const token = getToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${apiUrl}/membres/export/csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Erreur export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "membres.csv";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      key: "firstName",
      label: "Membre",
      render: (_: any, row: Membre) => (
        <Link href={`/dashboard/membres/${row.id}`} className="flex items-center gap-3 hover:opacity-80">
          <MemberAvatar name={`${row.firstName} ${row.lastName}`} photoUrl={row.photoUrl} size="sm" />
          <span className="font-medium text-foreground">
            {row.firstName} {row.lastName}
          </span>
        </Link>
      ),
    },
    { key: "email", label: "Email" },
    { key: "phone", label: "Telephone" },
    { key: "department", label: "Departement" },
    { key: "role", label: "Role" },
    {
      key: "isActive",
      label: "Statut",
      render: (val: boolean) => (
        <Badge label={val ? "Actif" : "Inactif"} variant={val ? "success" : "default"} />
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
        title="Gestion des Membres"
        subtitle="Fiches membres, anniversaires et carte"
        action={
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-card-border bg-card-bg text-sm font-medium text-foreground hover:bg-teal-muted transition-colors disabled:opacity-50"
            >
              <Download size={16} />
              {exporting ? "Export…" : "Exporter CSV"}
            </button>
            <Link
              href="/dashboard/membres/nouveau"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
            >
              <Plus size={16} />
              Nouveau membre
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {tab === "Liste" && (
          <>
            <div className="mb-4 max-w-sm">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Rechercher un membre…"
              />
            </div>
            <DataTable columns={columns} data={filtered} loading={loading} />
          </>
        )}

        {tab === "Anniversaires" && (
          <>
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <LoadingSpinner />
              </div>
            ) : upcomingBirthdays.length === 0 ? (
              <EmptyState
                icon={<Cake size={40} />}
                title="Aucun anniversaire dans les 30 prochains jours"
              />
            ) : (
              <div className="space-y-3">
                {upcomingBirthdays.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-4 rounded-xl bg-card-bg border border-card-border px-4 py-3"
                  >
                    <MemberAvatar
                      name={`${m.firstName} ${m.lastName}`}
                      photoUrl={m.photoUrl}
                      size="md"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">
                        {m.firstName} {m.lastName}
                      </p>
                      <p className="text-xs text-muted">{m.department}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gold">
                        <Cake size={14} className="inline mr-1" />
                        {m.birthDate
                          ? format(parseISO(m.birthDate), "dd MMMM")
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "Carte" && (
          <div className="flex items-center justify-center h-64 rounded-2xl border border-card-border bg-card-bg">
            <div className="text-center text-muted">
              <Users size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Carte interactive — bientôt disponible</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
