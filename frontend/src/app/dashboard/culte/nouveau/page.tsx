"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ClipboardList } from "lucide-react";

export default function NouveauServicePage() {
  const { isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    titre: "",
    date: "",
    theme: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const set = (key: string, value: string) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/culte", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/dashboard/culte");
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
    <div className="max-w-xl">
      <PageHeader
        title="Nouveau Service"
        subtitle="Créer un nouveau programme de culte"
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl bg-card-bg border border-card-border p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Titre du service <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.titre}
            onChange={(e) => set("titre", e.target.value)}
            placeholder="ex: Culte du dimanche matin"
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Thème</label>
          <input
            type="text"
            value={form.theme}
            onChange={(e) => set("theme", e.target.value)}
            placeholder="ex: La grâce de Dieu"
            className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push("/dashboard/culte")}
            className="px-5 py-2.5 rounded-lg border border-card-border bg-card-bg text-sm font-medium text-foreground hover:bg-teal-muted transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
          >
            <ClipboardList size={16} />
            {submitting ? "Création…" : "Créer le service"}
          </button>
        </div>
      </form>
    </div>
  );
}
