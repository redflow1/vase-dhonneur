"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Megaphone, Bell, Plus, CheckCheck } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  auteur: string;
  date: string;
  cible?: string;
}

interface Notification {
  id: string;
  titre: string;
  message: string;
  date: string;
  lu: boolean;
}

const TABS = ["Annonces", "Notifications"];
const CIBLE_OPTIONS = ["Tous", "Jeunesse", "Femmes", "Hommes", "Louange", "Intercession"];

export default function CommunicationPage() {
  const { isLoading: authLoading } = useAuth();
  const { data: annoncesResponse, loading: annLoading, error: annError, refetch: refetchAnn } =
    useApi<{ data: Annonce[] }>("/communication/annonces");
  const annonces = annoncesResponse?.data ?? [];
  const { data: notificationsResponse, loading: notifLoading, refetch: refetchNotif } =
    useApi<{ data: Notification[] }>("/communication/notifications");
  const notifications = notificationsResponse?.data ?? [];

  const [tab, setTab] = useState("Annonces");

  // Annonce modal
  const [annonceOpen, setAnnonceOpen] = useState(false);
  const [annonceForm, setAnnonceForm] = useState({ titre: "", contenu: "", cible: "Tous" });
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [annFormError, setAnnFormError] = useState("");

  const handleAddAnnonce = async (e: React.FormEvent) => {
    e.preventDefault();
    setAnnSubmitting(true);
    setAnnFormError("");
    try {
      await apiFetch("/communication/annonces", {
        method: "POST",
        body: JSON.stringify(annonceForm),
      });
      setAnnonceOpen(false);
      setAnnonceForm({ titre: "", contenu: "", cible: "Tous" });
      refetchAnn();
    } catch (err: any) {
      setAnnFormError(err.message || "Erreur");
    } finally {
      setAnnSubmitting(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await apiFetch(`/communication/notifications/${id}/read`, { method: "PUT" });
      refetchNotif();
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.lu);
    await Promise.all(unread.map((n) => apiFetch(`/communication/notifications/${n.id}/read`, { method: "PUT" }).catch(() => {})));
    refetchNotif();
  };

  const unreadCount = notifications.filter((n) => !n.lu).length;

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
        title="Communication"
        subtitle="Annonces de l'église et notifications"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Annonces ── */}
        {tab === "Annonces" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setAnnonceOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Nouvelle annonce
              </button>
            </div>

            {annError && (
              <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
                {annError}
              </div>
            )}

            {annLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : annonces.length === 0 ? (
              <EmptyState
                icon={<Megaphone size={40} />}
                title="Aucune annonce"
                description="Créez une nouvelle annonce pour la communauté."
              />
            ) : (
              <div className="space-y-4">
                {annonces.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl bg-card-bg border border-card-border p-5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-semibold text-foreground">{a.titre}</h3>
                      <span className="text-xs text-muted whitespace-nowrap">
                        {a.date ? format(parseISO(a.date), "dd/MM/yyyy") : ""}
                      </span>
                    </div>
                    <p className="text-sm text-muted line-clamp-3 mb-3">{a.contenu}</p>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>Par <span className="text-foreground font-medium">{a.auteur}</span></span>
                      {a.cible && a.cible !== "Tous" && (
                        <span className="px-2 py-0.5 rounded-full bg-teal-muted text-teal-deep font-medium">
                          {a.cible}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Notifications ── */}
        {tab === "Notifications" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted">
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}` : "Tout est lu"}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg text-xs font-medium text-foreground hover:bg-teal-muted transition-colors"
                >
                  <CheckCheck size={14} />
                  Tout marquer lu
                </button>
              )}
            </div>

            {notifLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : notifications.length === 0 ? (
              <EmptyState
                icon={<Bell size={40} />}
                title="Aucune notification"
              />
            ) : (
              <div className="space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.lu && handleMarkRead(n.id)}
                    className={`rounded-2xl border border-card-border p-4 flex items-start gap-4 transition-colors ${
                      !n.lu
                        ? "bg-teal-muted cursor-pointer hover:bg-teal-muted/80"
                        : "bg-card-bg"
                    }`}
                  >
                    <div className="mt-0.5">
                      <Bell
                        size={16}
                        className={n.lu ? "text-muted" : "text-teal-deep"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-semibold ${
                            n.lu ? "text-muted" : "text-foreground"
                          }`}
                        >
                          {n.titre}
                        </p>
                        <span className="text-xs text-muted whitespace-nowrap">
                          {n.date ? format(parseISO(n.date), "dd/MM/yyyy") : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                    {!n.lu && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-teal-deep mt-1.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Annonce modal */}
      <Modal open={annonceOpen} onClose={() => setAnnonceOpen(false)} title="Nouvelle annonce" size="md">
        <form onSubmit={handleAddAnnonce} className="space-y-4">
          {annFormError && <p className="text-sm text-red-500">{annFormError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Titre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={annonceForm.titre}
              onChange={(e) => setAnnonceForm((p) => ({ ...p, titre: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Contenu <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={annonceForm.contenu}
              onChange={(e) => setAnnonceForm((p) => ({ ...p, contenu: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Cible</label>
            <select
              value={annonceForm.cible}
              onChange={(e) => setAnnonceForm((p) => ({ ...p, cible: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              {CIBLE_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => setAnnonceOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={annSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {annSubmitting ? "Publication…" : "Publier"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
