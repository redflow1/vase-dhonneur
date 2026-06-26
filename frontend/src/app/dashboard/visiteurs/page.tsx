"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { UserPlus, AlertTriangle, ChevronDown, ChevronUp, Plus, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";

type VisiteurStatut = "NOUVEAU" | "RELANCE" | "CONVERTI" | "BAPTISE" | "INTEGRE";

interface SuiviStep {
  id: string;
  date: string;
  note: string;
  step: string;
}

interface Visiteur {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  firstVisit?: string;
  status: VisiteurStatut;
  followUps?: SuiviStep[];
}

interface Alerte {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  firstVisit?: string;
  status: VisiteurStatut;
}

const STATUTS: VisiteurStatut[] = ["NOUVEAU", "RELANCE", "CONVERTI", "BAPTISE", "INTEGRE"];
const FILTER_TABS = ["Tous", ...STATUTS];

const STATUT_VARIANT: Record<string, "default" | "warning" | "success" | "info" | "danger"> = {
  NOUVEAU: "info",
  RELANCE: "warning",
  CONVERTI: "success",
  BAPTISE: "success",
  INTEGRE: "default",
};

const ETAPES = [
  "Premier contact",
  "Visite à domicile",
  "Cours d'intégration",
  "Baptême",
  "Intégration département",
  "Autre",
];

export default function VisiteursPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: visiteursData, loading, error, refetch } = useApi<{ data: Visiteur[] }>("/visiteurs");
  const { data: alertesData, loading: alertesLoading } = useApi<{ data: Alerte[] }>("/visiteurs/alertes");

  const visiteurs = visiteursData?.data ?? [];
  const alertes = alertesData?.data ?? [];

  const [activeFilter, setActiveFilter] = useState("Tous");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Nouveau visiteur modal
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ firstName: "", lastName: "", phone: "", firstVisit: "" });
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState("");

  // Suivi modal
  const [suiviOpen, setSuiviOpen] = useState(false);
  const [suiviVisiteurId, setSuiviVisiteurId] = useState("");
  const [suiviForm, setSuiviForm] = useState({ note: "", step: ETAPES[0] });
  const [suiviSubmitting, setSuiviSubmitting] = useState(false);
  const [suiviError, setSuiviError] = useState("");

  const filteredVisiteurs = useMemo(() => {
    if (!visiteurs.length) return [];
    if (activeFilter === "Tous") return visiteurs;
    return visiteurs.filter((v) => v.status === activeFilter);
  }, [visiteurs, activeFilter]);

  const handleNewVisiteur = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSubmitting(true);
    setNewError("");
    try {
      await apiFetch("/visiteurs", { method: "POST", body: JSON.stringify(newForm) });
      setNewOpen(false);
      setNewForm({ firstName: "", lastName: "", phone: "", firstVisit: "" });
      refetch();
    } catch (err: any) {
      setNewError(err.message || "Erreur");
    } finally {
      setNewSubmitting(false);
    }
  };

  const openSuivi = (id: string) => {
    setSuiviVisiteurId(id);
    setSuiviForm({ note: "", step: ETAPES[0] });
    setSuiviError("");
    setSuiviOpen(true);
  };

  const handleAddSuivi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuiviSubmitting(true);
    setSuiviError("");
    try {
      await apiFetch(`/visiteurs/${suiviVisiteurId}/suivi`, {
        method: "POST",
        body: JSON.stringify(suiviForm),
      });
      setSuiviOpen(false);
      refetch();
    } catch (err: any) {
      setSuiviError(err.message || "Erreur");
    } finally {
      setSuiviSubmitting(false);
    }
  };

  const handleStatutChange = async (id: string, statut: VisiteurStatut) => {
    try {
      await apiFetch(`/visiteurs/${id}/statut`, { method: "PATCH", body: JSON.stringify({ status: statut }) });
      refetch();
    } catch (err: any) {
      alert(err.message || "Erreur");
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
    <div>
      <PageHeader
        title="Visiteurs & Convertis"
        subtitle="Registre des visiteurs, suivi et intégration"
        action={
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
          >
            <Plus size={16} />
            Nouveau visiteur
          </button>
        }
      />

      {/* Alertes section */}
      {!alertesLoading && alertes && alertes.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gold-muted border border-gold/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-gold" />
            <span className="font-semibold text-gold text-sm">
              {alertes.length} visiteur{alertes.length > 1 ? "s" : ""} sans suivi récent
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alertes.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl bg-card-bg border border-gold/30 px-3 py-2 text-xs"
              >
                <span className="font-medium text-foreground">
                  {a.firstName} {a.lastName}
                </span>
                <Badge label={a.status} variant={STATUT_VARIANT[a.status] ?? "default"} />
                {a.firstVisit && (
                  <span className="text-muted">
                    depuis le {format(parseISO(a.firstVisit), "dd/MM")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex overflow-x-auto border-b border-card-border gap-1 no-scrollbar mb-4">
        {FILTER_TABS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
              activeFilter === f
                ? "border-b-2 border-teal-deep text-teal-deep font-semibold"
                : "text-muted hover:text-foreground hover:bg-teal-muted rounded-t-lg"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Visiteurs grid */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filteredVisiteurs.length === 0 ? (
        <EmptyState
          icon={<UserPlus size={40} />}
          title="Aucun visiteur"
          description="Enregistrez un nouveau visiteur pour commencer le suivi."
        />
      ) : (
        <div className="space-y-3">
          {filteredVisiteurs.map((v) => (
            <div key={v.id} className="rounded-2xl bg-card-bg border border-card-border overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="font-semibold text-foreground">
                      {v.firstName} {v.lastName}
                    </p>
                    <Badge
                      label={v.status}
                      variant={STATUT_VARIANT[v.status] ?? "default"}
                    />
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-muted">
                    {v.phone && <span>{v.phone}</span>}
                    {v.firstVisit && (
                      <span>
                        1re visite : {format(parseISO(v.firstVisit), "dd/MM/yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status changer */}
                  <select
                    value={v.status}
                    onChange={(e) => handleStatutChange(v.id, e.target.value as VisiteurStatut)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
                  >
                    {STATUTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button
                    onClick={(e) => { e.stopPropagation(); openSuivi(v.id); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg text-xs font-medium text-foreground hover:bg-teal-muted transition-colors"
                  >
                    <Plus size={12} />
                    Suivi
                  </button>
                  <button
                    onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
                    className="p-1.5 rounded-lg hover:bg-teal-muted transition-colors"
                  >
                    {expandedId === v.id ? (
                      <ChevronUp size={16} className="text-muted" />
                    ) : (
                      <ChevronDown size={16} className="text-muted" />
                    )}
                  </button>
                </div>
              </div>

              {/* Timeline */}
              {expandedId === v.id && (
                <div className="border-t border-card-border px-5 py-4">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                    Historique des suivis
                  </p>
                  {!v.followUps || v.followUps.length === 0 ? (
                    <p className="text-sm text-muted">Aucun suivi enregistré pour ce visiteur.</p>
                  ) : (
                    <div className="relative pl-5">
                      {/* Vertical line */}
                      <div className="absolute left-1.5 top-0 bottom-0 w-px bg-card-border" />
                      <div className="space-y-4">
                        {[...v.followUps].sort((a, b) => a.date > b.date ? -1 : 1).map((s) => (
                          <div key={s.id} className="relative flex gap-3">
                            <div className="absolute -left-3.5 mt-1 w-2.5 h-2.5 rounded-full bg-teal-deep border-2 border-card-bg" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-teal-deep">{s.step}</span>
                                <span className="text-xs text-muted flex items-center gap-1">
                                  <Clock size={10} />
                                  {s.date ? format(parseISO(s.date), "dd/MM/yyyy") : "—"}
                                </span>
                              </div>
                              {s.note && (
                                <p className="text-sm text-foreground">{s.note}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nouveau visiteur modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nouveau visiteur" size="sm">
        <form onSubmit={handleNewVisiteur} className="space-y-4">
          {newError && <p className="text-sm text-red-500">{newError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newForm.firstName}
                onChange={(e) => setNewForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newForm.lastName}
                onChange={(e) => setNewForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Téléphone</label>
            <input
              type="tel"
              value={newForm.phone}
              onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Date de 1re visite</label>
            <input
              type="date"
              value={newForm.firstVisit}
              onChange={(e) => setNewForm((p) => ({ ...p, firstVisit: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setNewOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={newSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {newSubmitting ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Ajouter suivi modal */}
      <Modal open={suiviOpen} onClose={() => setSuiviOpen(false)} title="Ajouter un suivi" size="sm">
        <form onSubmit={handleAddSuivi} className="space-y-4">
          {suiviError && <p className="text-sm text-red-500">{suiviError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Étape</label>
            <select
              value={suiviForm.step}
              onChange={(e) => setSuiviForm((p) => ({ ...p, step: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {ETAPES.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Note</label>
            <textarea
              rows={4}
              value={suiviForm.note}
              onChange={(e) => setSuiviForm((p) => ({ ...p, note: e.target.value }))}
              placeholder="Observations, compte-rendu…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSuiviOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={suiviSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {suiviSubmitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
