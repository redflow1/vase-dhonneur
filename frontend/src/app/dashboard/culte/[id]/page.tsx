"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CheckCircle, FileDown, Plus, X } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ServiceItem {
  id: string;
  roleName: string;
  assignedPersonId?: string;
  assignedPersonName?: string;
  duration?: number;
  order: number;
}

interface Service {
  id: string;
  titre: string;
  date: string;
  theme: string;
  statut: "BROUILLON" | "VALIDE" | "TERMINE";
  items: ServiceItem[];
}

interface Membre {
  id: string;
  prenom: string;
  nom: string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function ServiceDetailPage() {
  const { isLoading: authLoading } = useAuth();
  const params = useParams();
  const id = params?.id as string;

  const { data: service, loading, error, refetch } = useApi<Service>(`/culte/${id}`);
  const { data: membres } = useApi<Membre[]>("/membres");

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ roleName: "", assignedPersonId: "", duration: "" });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState("");

  const [validating, setValidating] = useState(false);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError("");
    try {
      await apiFetch(`/culte/${id}/items`, {
        method: "POST",
        body: JSON.stringify({
          roleName: addForm.roleName,
          assignedPersonId: addForm.assignedPersonId || undefined,
          duration: addForm.duration ? Number(addForm.duration) : undefined,
        }),
      });
      setAddOpen(false);
      setAddForm({ roleName: "", assignedPersonId: "", duration: "" });
      refetch();
    } catch (err: any) {
      setAddError(err.message || "Erreur");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await apiFetch(`/culte/${id}/items/${itemId}`, { method: "DELETE" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Erreur");
    }
  };

  const handleValider = async () => {
    setValidating(true);
    try {
      await apiFetch(`/culte/${id}/valider`, { method: "PATCH" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Erreur");
    } finally {
      setValidating(false);
    }
  };

  const handleExportPdf = () => {
    window.open(`${API_BASE}/culte/${id}/pdf`, "_blank");
  };

  const setField = (k: string, v: string) => setAddForm((p) => ({ ...p, [k]: v }));

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
        {error}
      </div>
    );
  }

  if (!service) return null;

  const sortedItems = [...(service.items ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div>
      <PageHeader
        title={service.titre}
        subtitle={service.theme || "Aucun thème"}
        action={
          <div className="flex gap-2 flex-wrap">
            {service.statut === "BROUILLON" && (
              <button
                onClick={handleValider}
                disabled={validating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {validating ? "Validation…" : "Valider le service"}
              </button>
            )}
            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-card-border bg-card-bg text-sm font-medium text-foreground hover:bg-teal-muted transition-colors"
            >
              <FileDown size={16} />
              Exporter PDF
            </button>
          </div>
        }
      />

      {/* Info bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 rounded-2xl bg-card-bg border border-card-border px-5 py-4 text-sm">
        <span className="text-muted">
          Date :{" "}
          <span className="font-medium text-foreground">
            {service.date ? format(parseISO(service.date), "dd/MM/yyyy") : "—"}
          </span>
        </span>
        <span className="text-muted">
          Thème :{" "}
          <span className="font-medium text-foreground">{service.theme || "—"}</span>
        </span>
        <Badge
          label={STATUT_LABELS[service.statut] ?? service.statut}
          variant={STATUT_VARIANT[service.statut] ?? "default"}
        />
      </div>

      {/* Items list */}
      <div className="rounded-2xl bg-card-bg border border-card-border overflow-hidden mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-card-border">
          <h2 className="font-semibold text-foreground">Éléments du service</h2>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-deep text-white text-xs font-medium hover:bg-teal-light transition-colors"
          >
            <Plus size={14} />
            Ajouter un élément
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="py-10 text-center text-muted text-sm">
            Aucun élément pour ce service.
          </div>
        ) : (
          <div className="divide-y divide-card-border">
            {sortedItems.map((item, idx) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-teal-muted transition-colors"
              >
                <span className="w-6 text-xs text-muted font-mono">{idx + 1}.</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">{item.roleName}</p>
                  {item.assignedPersonName && (
                    <p className="text-xs text-muted">{item.assignedPersonName}</p>
                  )}
                </div>
                {item.duration && (
                  <span className="text-xs text-muted">{item.duration} min</span>
                )}
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1 rounded text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Supprimer"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add item modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Ajouter un élément" size="sm">
        <form onSubmit={handleAddItem} className="space-y-4">
          {addError && <p className="text-sm text-red-500">{addError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Rôle / Élément <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={addForm.roleName}
              onChange={(e) => setField("roleName", e.target.value)}
              placeholder="ex: Louange, Prédication, Prière…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Personne assignée
            </label>
            <select
              value={addForm.assignedPersonId}
              onChange={(e) => setField("assignedPersonId", e.target.value)}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              <option value="">— Sélectionner un membre —</option>
              {(membres ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.prenom} {m.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Durée (minutes)</label>
            <input
              type="number"
              min={0}
              value={addForm.duration}
              onChange={(e) => setField("duration", e.target.value)}
              placeholder="ex: 15"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={addSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {addSubmitting ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
