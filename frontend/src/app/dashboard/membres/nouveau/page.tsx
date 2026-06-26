"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import { ROLE_LABELS, Role } from "@/lib/modules";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { UserPlus, Upload } from "lucide-react";

const DEPARTEMENTS = [
  "Louange",
  "Intercession",
  "Jeunesse",
  "Femmes",
  "Hommes",
  "Accueil",
  "Communication",
  "EVA",
  "MRS",
  "Administration",
  "Autre",
];

const ROLES = Object.entries(ROLE_LABELS) as [Role, string][];

export default function NouveauMembrePage() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    dateNaissance: "",
    adresse: "",
    departement: "",
    role: "MEMBRE" as Role,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/membres", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/dashboard/membres");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Nouveau Membre"
        subtitle="Remplissez les informations pour créer une fiche membre"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo upload placeholder */}
        <div className="flex flex-col items-center gap-3 py-6 rounded-2xl border-2 border-dashed border-card-border bg-card-bg">
          <div className="w-20 h-20 rounded-full bg-teal-muted flex items-center justify-center">
            <Upload size={28} className="text-teal-deep" />
          </div>
          <p className="text-sm text-muted">Photo du membre (disponible prochainement)</p>
        </div>

        <div className="rounded-2xl bg-card-bg border border-card-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground mb-2">Informations personnelles</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.prenom}
                onChange={(e) => set("prenom", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.nom}
                onChange={(e) => set("nom", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                placeholder="Nom de famille"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                placeholder="email@exemple.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => set("telephone", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                placeholder="+243 000 000 000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Date de naissance</label>
            <input
              type="date"
              value={form.dateNaissance}
              onChange={(e) => set("dateNaissance", e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Adresse</label>
            <input
              type="text"
              value={form.adresse}
              onChange={(e) => set("adresse", e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              placeholder="Adresse complète"
            />
          </div>
        </div>

        <div className="rounded-2xl bg-card-bg border border-card-border p-6 space-y-4">
          <h2 className="font-semibold text-foreground mb-2">Rôle dans l'église</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Département</label>
              <select
                value={form.departement}
                onChange={(e) => set("departement", e.target.value)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              >
                <option value="">— Sélectionner —</option>
                {DEPARTEMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={(e) => set("role", e.target.value as Role)}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              >
                {ROLES.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pb-6">
          <button
            type="button"
            onClick={() => router.push("/dashboard/membres")}
            className="px-6 py-2.5 rounded-lg border border-card-border bg-card-bg text-sm font-medium text-foreground hover:bg-teal-muted transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
          >
            <UserPlus size={16} />
            {submitting ? "Création…" : "Créer le membre"}
          </button>
        </div>
      </form>
    </div>
  );
}
