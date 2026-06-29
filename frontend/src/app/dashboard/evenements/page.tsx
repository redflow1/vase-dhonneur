"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Calendar, Plus, ChevronDown, ChevronUp, Download, Users } from "lucide-react";
import { format, parseISO } from "date-fns";

type EvenementType = "CULTE" | "CROISADE" | "CONFERENCE" | "CAMP" | "REUNION" | "AUTRE";

interface Participant {
  id: string;
  status?: string;
  userId?: string;
  firstName: string;
  lastName: string;
}

interface Evenement {
  id: string;
  title: string;
  description?: string;
  type: EvenementType;
  startDate: string;
  endDate: string;
  location?: string;
  capacity?: number;
  _count?: { registrations: number };
  isInscrit?: boolean;
  registrationStatus?: string | null;
}

const TYPE_VARIANT: Record<EvenementType, "default" | "success" | "warning" | "info" | "danger"> = {
  CULTE: "success",
  CROISADE: "warning",
  CONFERENCE: "info",
  CAMP: "success",
  REUNION: "default",
  AUTRE: "default",
};

const EVENT_TYPES: EvenementType[] = ["CULTE", "CROISADE", "CONFERENCE", "CAMP", "REUNION", "AUTRE"];

export default function EvenementsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: evenementsData, loading, error, refetch } = useApi<{ data: Evenement[] }>("/evenements");
  const evenements = evenementsData?.data ?? [];

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingParticipants, setLoadingParticipants] = useState<string | null>(null);
  const [participantsMap, setParticipantsMap] = useState<Record<string, Participant[]>>({});

  // Inscription/annulation
  const [inscriptionLoading, setInscriptionLoading] = useState<string | null>(null);

  // Confirmation / Présence
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleConfirm = async (evId: string) => {
    setActionLoading(`confirm-${evId}`);
    try {
      await apiFetch(`/evenements/${evId}/confirm`, { method: "POST" });
      refetch();
    } catch (err: any) {
      alert(err.message || "Erreur");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPresent = async (evId: string, userId: string) => {
    setActionLoading(`present-${evId}-${userId}`);
    try {
      await apiFetch(`/evenements/${evId}/present/${userId}`, { method: "POST" });
      const result = await apiFetch(`/evenements/${evId}/participants`);
      const participants = (result?.data ?? result ?? []).map((r: any) => ({
        id: r.user?.id ?? r.id,
        userId: r.user?.id ?? r.userId ?? r.id,
        firstName: r.user?.firstName ?? r.firstName ?? "",
        lastName: r.user?.lastName ?? r.lastName ?? "",
        status: r.status ?? "INSCRIT",
      }));
      setParticipantsMap((p) => ({ ...p, [evId]: participants }));
    } catch {
    } finally {
      setActionLoading(null);
    }
  };

  // Nouvel événement modal
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    titre: "",
    description: "",
    type: "CULTE" as EvenementType,
    startDate: "",
    endDate: "",
    location: "",
    capacity: "",
  });
  const [newSubmitting, setNewSubmitting] = useState(false);
  const [newError, setNewError] = useState("");

  const handleExpand = async (ev: Evenement) => {
    if (expandedId === ev.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(ev.id);
    if (isAdmin && !participantsMap[ev.id]) {
      setLoadingParticipants(ev.id);
      try {
        const result = await apiFetch(`/evenements/${ev.id}/participants`);
        const participants = (result?.data ?? result ?? []).map((r: any) => ({
          id: r.user?.id ?? r.id,
          userId: r.user?.id ?? r.userId ?? r.id,
          firstName: r.user?.firstName ?? r.firstName ?? "",
          lastName: r.user?.lastName ?? r.lastName ?? "",
          status: r.status ?? "INSCRIT",
        }));
        setParticipantsMap((p) => ({ ...p, [ev.id]: participants }));
      } catch {
        // silent
      } finally {
        setLoadingParticipants(null);
      }
    }
  };

  const handleInscription = async (ev: Evenement) => {
    setInscriptionLoading(ev.id);
    try {
      if (ev.isInscrit) {
        await apiFetch(`/evenements/${ev.id}/inscription`, { method: "DELETE" });
      } else {
        await apiFetch(`/evenements/${ev.id}/inscription`, { method: "POST" });
      }
      refetch();
    } catch (err: any) {
      alert(err.message || "Erreur");
    } finally {
      setInscriptionLoading(null);
    }
  };

  const handleExportParticipants = (id: string) => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    window.open(`${API_URL}/evenements/${id}/participants?format=csv`, "_blank");
  };

  const handleNewEvenement = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSubmitting(true);
    setNewError("");
    try {
      await apiFetch("/evenements", {
        method: "POST",
        body: JSON.stringify({
          ...newForm,
          capacity: newForm.capacity ? parseInt(newForm.capacity) : undefined,
        }),
      });
      setNewOpen(false);
      setNewForm({ titre: "", description: "", type: "CULTE", startDate: "", endDate: "", location: "", capacity: "" });
      refetch();
    } catch (err: any) {
      setNewError(err.message || "Erreur");
    } finally {
      setNewSubmitting(false);
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
        title="Événements & Croisades"
        subtitle="Calendrier des événements et gestion des inscriptions"
        action={
          isAdmin ? (
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
            >
              <Plus size={16} />
              Nouvel événement
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : evenements.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title="Aucun événement"
          description="Aucun événement n'est planifié pour le moment."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {evenements.map((ev) => (
            <div key={ev.id} className="rounded-2xl bg-card-bg border border-card-border overflow-hidden flex flex-col">
              {/* Card header */}
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground leading-tight">{ev.title}</h3>
                  <Badge label={ev.type} variant={TYPE_VARIANT[ev.type] ?? "default"} />
                </div>

                <div className="space-y-1 text-xs text-muted mb-4">
                  <p className="flex items-center gap-1.5">
                    <Calendar size={12} />
                    {format(parseISO(ev.startDate), "dd/MM/yyyy")}
                    {ev.endDate && ev.endDate !== ev.startDate && ` → ${format(parseISO(ev.endDate), "dd/MM/yyyy")}`}
                  </p>
                  {ev.location && <p>{ev.location}</p>}
                  {ev.capacity && (
                    <p className="flex items-center gap-1.5">
                      <Users size={12} />
                      <span>{ev._count?.registrations ?? 0}/{ev.capacity} inscrits</span>
                      {(ev._count?.registrations ?? 0) >= ev.capacity && (
                        <Badge label="Complet" variant="danger" />
                      )}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {ev.isInscrit && ev.registrationStatus === "INSCRIT" && (
                    <button
                      onClick={() => handleConfirm(ev.id)}
                      disabled={actionLoading === `confirm-${ev.id}`}
                      className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 transition-colors disabled:opacity-50"
                    >
                      {actionLoading === `confirm-${ev.id}` ? "…" : "Confirmer ma présence"}
                    </button>
                  )}
                  {ev.isInscrit && ev.registrationStatus === "CONFIRMÉ" && (
                    <span className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-center">
                      ✓ Présence confirmée
                    </span>
                  )}
                  <button
                    onClick={() => handleInscription(ev)}
                    disabled={inscriptionLoading === ev.id || (!ev.isInscrit && !!ev.capacity && (ev._count?.registrations ?? 0) >= ev.capacity)}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                      ev.isInscrit && ev.registrationStatus !== "PRÉSENT"
                        ? "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                        : ev.registrationStatus === "PRÉSENT"
                        ? "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed"
                        : "bg-teal-deep text-white hover:bg-teal-light"
                    }`}
                  >
                    {inscriptionLoading === ev.id ? "…"
                      : ev.registrationStatus === "PRÉSENT" ? "Présent ✓"
                      : ev.isInscrit ? "Annuler"
                      : "S'inscrire"}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleExportParticipants(ev.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg text-xs font-medium text-foreground hover:bg-teal-muted transition-colors"
                    >
                      <Download size={12} />
                      Exporter
                    </button>
                  )}
                  <button
                    onClick={() => handleExpand(ev)}
                    className="p-1.5 rounded-lg hover:bg-teal-muted transition-colors"
                  >
                    {expandedId === ev.id ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                  </button>
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === ev.id && (
                <div className="border-t border-card-border px-5 py-4 space-y-3">
                  {ev.description && (
                    <p className="text-sm text-foreground leading-relaxed">{ev.description}</p>
                  )}
                  {isAdmin && (
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Participants</p>
                      {loadingParticipants === ev.id ? (
                        <LoadingSpinner size="sm" />
                      ) : participantsMap[ev.id]?.length ? (
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {participantsMap[ev.id].map((p) => (
                            <div key={p.id} className="flex items-center justify-between text-xs bg-teal-muted text-teal-deep rounded-lg px-3 py-2">
                              <span className="font-medium">{p.firstName} {p.lastName}</span>
                              <div className="flex items-center gap-2">
                                {p.status === "PRÉSENT" ? (
                                  <span className="text-green-600 dark:text-green-400 font-semibold">✓ Présent</span>
                                ) : (
                                  <button
                                    onClick={() => handleMarkPresent(ev.id, p.userId!)}
                                    disabled={actionLoading === `present-${ev.id}-${p.userId}`}
                                    className="px-2 py-0.5 rounded bg-teal-deep text-white text-[10px] hover:bg-teal-light transition disabled:opacity-50"
                                  >
                                    {actionLoading === `present-${ev.id}-${p.userId}` ? "…" : "Marquer présent"}
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted">Aucun participant inscrit.</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal : Nouvel événement */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nouvel événement" size="md">
        <form onSubmit={handleNewEvenement} className="space-y-4">
          {newError && <p className="text-sm text-red-500">{newError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Titre <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={newForm.titre}
              onChange={(e) => setNewForm((p) => ({ ...p, titre: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Description</label>
            <textarea
              rows={3}
              value={newForm.description}
              onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Type <span className="text-red-500">*</span></label>
            <select
              value={newForm.type}
              onChange={(e) => setNewForm((p) => ({ ...p, type: e.target.value as EvenementType }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Début <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={newForm.startDate}
                onChange={(e) => setNewForm((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Fin <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={newForm.endDate}
                onChange={(e) => setNewForm((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Lieu</label>
            <input
              type="text"
              value={newForm.location}
              onChange={(e) => setNewForm((p) => ({ ...p, location: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Capacité maximale</label>
            <input
              type="number"
              min={0}
              value={newForm.capacity}
              onChange={(e) => setNewForm((p) => ({ ...p, capacity: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setNewOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={newSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {newSubmitting ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
