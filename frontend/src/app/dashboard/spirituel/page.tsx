"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Heart, BookOpen, CheckCircle, XCircle, Plus, Video, Headphones } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Priere {
  id: string;
  content: string;
  prayCount: number;
  answered: boolean;
  user?: { firstName: string; lastName: string };
  createdAt: string;
}

interface Temoignage {
  id: string;
  content: string;
  user: { firstName: string; lastName: string };
  createdAt: string;
}

interface Ressource {
  id: string;
  title: string;
  preacher: string;
  date: string;
  audioUrl?: string;
  videoUrl?: string;
  textContent?: string;
}

interface PlanLecture {
  id: string;
  title: string;
  totalDays: number;
  progress?: { completedDays: number; done: boolean } | null;
}

const TABS = ["Mur de prière", "Témoignages", "Ressources", "Plan de lecture"];

export default function SpirituelPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";

  const { data: prieresData, loading: priLoading, refetch: refetchPri } = useApi<{ data: Priere[] }>("/spirituel/prieres");
  const { data: temoignagesData, loading: temLoading, refetch: refetchTem } = useApi<{ data: Temoignage[] }>("/spirituel/temoignages");
  const { data: ressourcesData, loading: resLoading } = useApi<{ data: Ressource[] }>("/spirituel/sermons");
  const { data: planData, loading: planLoading, refetch: refetchPlan } = useApi<{ data: PlanLecture[] }>("/espace/plan-lecture");

  const prieres = prieresData?.data ?? [];
  const temoignages = temoignagesData?.data ?? [];
  const ressources = ressourcesData?.data ?? [];
  const plan = planData?.data?.[0] ?? null;

  const [tab, setTab] = useState("Mur de prière");
  const [markingDay, setMarkingDay] = useState(false);

  // Prière modal
  const [priereOpen, setPriereOpen] = useState(false);
  const [priereForm, setPriereForm] = useState({ contenu: "" });
  const [priereSubmitting, setPriereSubmitting] = useState(false);
  const [priereError, setPriereError] = useState("");

  // Témoignage modal
  const [temOpen, setTemOpen] = useState(false);
  const [temForm, setTemForm] = useState({ contenu: "" });
  const [temSubmitting, setTemSubmitting] = useState(false);
  const [temError, setTemError] = useState("");

  const handlePrier = async (id: string) => {
    try {
      await apiFetch(`/spirituel/prieres/${id}/prier`, { method: "POST" });
      refetchPri();
    } catch {
      // silent
    }
  };

  const handleSubmitPriere = async (e: React.FormEvent) => {
    e.preventDefault();
    setPriereSubmitting(true);
    setPriereError("");
    try {
      await apiFetch("/spirituel/prieres", { method: "POST", body: JSON.stringify(priereForm) });
      setPriereOpen(false);
      setPriereForm({ contenu: "" });
      refetchPri();
    } catch (err: any) {
      setPriereError(err.message || "Erreur");
    } finally {
      setPriereSubmitting(false);
    }
  };

  const handleSubmitTemoignage = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemSubmitting(true);
    setTemError("");
    try {
      await apiFetch("/spirituel/temoignages", { method: "POST", body: JSON.stringify(temForm) });
      setTemOpen(false);
      setTemForm({ contenu: "" });
      refetchTem();
    } catch (err: any) {
      setTemError(err.message || "Erreur");
    } finally {
      setTemSubmitting(false);
    }
  };

  const handleApproveTem = async (id: string, approve: boolean) => {
    try {
      await apiFetch(`/spirituel/temoignages/${id}/${approve ? "approuver" : "rejeter"}`, { method: "PATCH" });
      refetchTem();
    } catch {
      // silent
    }
  };

  const handleMarquerJour = async () => {
    if (!plan) return;
    setMarkingDay(true);
    try {
      await apiFetch(`/espace/plan-lecture/${plan.id}`, { method: "PUT" });
      refetchPlan();
    } catch (e: any) {
      alert(e.message || "Erreur");
    } finally {
      setMarkingDay(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const progress =
    plan && plan.totalDays > 0
      ? Math.min(((plan.progress?.completedDays ?? 0) / plan.totalDays) * 100, 100)
      : 0;

  const approvedTem = temoignages;
  const pendingTem: Temoignage[] = [];

  return (
    <div>
      <PageHeader
        title="Spirituel & Pastoral"
        subtitle="Prière, témoignages, ressources et lecture"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Mur de prière ── */}
        {tab === "Mur de prière" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setPriereOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Soumettre une prière
              </button>
            </div>

            {priLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !prieres || prieres.length === 0 ? (
              <EmptyState icon={<Heart size={40} />} title="Aucune demande de prière" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {prieres.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-card-bg border border-card-border p-5 flex flex-col gap-3"
                  >
                    <p className="text-sm text-foreground leading-relaxed flex-1">{p.content}</p>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => handlePrier(p.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-teal-deep hover:text-teal-light transition-colors"
                      >
                        <Heart size={14} />
                        Je prie ({p.prayCount})
                      </button>
                      <div className="flex items-center gap-2">
                        {p.answered && <Badge label="Exaucée" variant="success" />}
                        <span className="text-xs text-muted">
                          {p.createdAt ? format(parseISO(p.createdAt), "dd/MM") : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Témoignages ── */}
        {tab === "Témoignages" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setTemOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Partager un témoignage
              </button>
            </div>

            {temLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : (
              <div className="space-y-6">
                {isAdmin && pendingTem.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gold mb-3">En attente de validation ({pendingTem.length})</h3>
                    <div className="space-y-3">
                      {pendingTem.map((t) => (
                        <div key={t.id} className="rounded-2xl bg-gold-muted border border-gold/30 p-4 flex flex-col gap-3">
                          <p className="text-sm text-foreground">{t.content}</p>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs text-muted">
                              {t.user ? `${t.user.firstName} ${t.user.lastName}` : "—"} — {t.createdAt ? format(parseISO(t.createdAt), "dd/MM/yyyy") : ""}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveTem(t.id, true)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-deep text-white text-xs font-medium hover:bg-teal-light transition-colors"
                              >
                                <CheckCircle size={13} />
                                Approuver
                              </button>
                              <button
                                onClick={() => handleApproveTem(t.id, false)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                              >
                                <XCircle size={13} />
                                Rejeter
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  {approvedTem.length === 0 ? (
                    <EmptyState icon={<Heart size={40} />} title="Aucun témoignage approuvé" />
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {approvedTem.map((t) => (
                        <div key={t.id} className="rounded-2xl bg-card-bg border border-card-border p-5">
                          <p className="text-sm text-foreground leading-relaxed mb-3">{t.content}</p>
                          <p className="text-xs text-muted">
                            {t.user ? `${t.user.firstName} ${t.user.lastName}` : "—"} — {t.createdAt ? format(parseISO(t.createdAt), "dd/MM/yyyy") : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Ressources ── */}
        {tab === "Ressources" && (
          <>
            {resLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !ressources || ressources.length === 0 ? (
              <EmptyState icon={<BookOpen size={40} />} title="Aucune ressource disponible" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ressources.map((r) => (
                  <div key={r.id} className="rounded-2xl bg-card-bg border border-card-border p-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-foreground text-sm">{r.title}</h3>
                      <div className="flex-shrink-0">
                        {r.audioUrl && <Headphones size={16} className="text-teal-deep" />}
                        {r.videoUrl && <Video size={16} className="text-gold" />}
                        {!r.audioUrl && !r.videoUrl && <BookOpen size={16} className="text-muted" />}
                      </div>
                    </div>
                    <div className="text-xs text-muted space-y-0.5">
                      <p>Prédicateur : <span className="text-foreground">{r.preacher}</span></p>
                      <p>{r.date ? format(parseISO(r.date), "dd/MM/yyyy") : "—"}</p>
                    </div>
                    {r.audioUrl && (
                      <audio controls src={r.audioUrl} className="w-full h-8 mt-1" />
                    )}
                    {r.videoUrl && (
                      <a
                        href={r.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-teal-deep hover:underline flex items-center gap-1"
                      >
                        <Video size={12} />
                        Voir la vidéo
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Plan de lecture ── */}
        {tab === "Plan de lecture" && (
          <div className="max-w-md">
            {planLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : plan ? (
              <div className="rounded-2xl bg-card-bg border border-card-border p-6 flex flex-col gap-4">
                <h3 className="font-semibold text-foreground">{plan.title}</h3>
                <div>
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>{plan.progress?.completedDays ?? 0} jour{(plan.progress?.completedDays ?? 0) !== 1 ? "s" : ""} complété{(plan.progress?.completedDays ?? 0) !== 1 ? "s" : ""}</span>
                    <span>{plan.totalDays} jours au total</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-teal-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-deep transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-1 text-right">{Math.round(progress)}%</p>
                </div>
                <button
                  onClick={handleMarquerJour}
                  disabled={markingDay || (plan.progress?.completedDays ?? 0) >= plan.totalDays}
                  className="self-start px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
                >
                  {markingDay ? "Enregistrement…" : "Marquer le jour"}
                </button>
              </div>
            ) : (
              <EmptyState icon={<BookOpen size={40} />} title="Aucun plan de lecture actif" />
            )}
          </div>
        )}
      </div>

      {/* Prière modal */}
      <Modal open={priereOpen} onClose={() => setPriereOpen(false)} title="Soumettre une prière" size="md">
        <form onSubmit={handleSubmitPriere} className="space-y-4">
          {priereError && <p className="text-sm text-red-500">{priereError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Demande de prière <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={5}
              value={priereForm.contenu}
              onChange={(e) => setPriereForm({ contenu: e.target.value })}
              placeholder="Partagez votre demande de prière…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPriereOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={priereSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {priereSubmitting ? "Envoi…" : "Soumettre"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Témoignage modal */}
      <Modal open={temOpen} onClose={() => setTemOpen(false)} title="Partager un témoignage" size="md">
        <form onSubmit={handleSubmitTemoignage} className="space-y-4">
          {temError && <p className="text-sm text-red-500">{temError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Votre témoignage <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={temForm.contenu}
              onChange={(e) => setTemForm({ contenu: e.target.value })}
              placeholder="Partagez ce que Dieu a fait dans votre vie…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <p className="text-xs text-muted">Votre témoignage sera visible après validation par un modérateur.</p>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setTemOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={temSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {temSubmitting ? "Envoi…" : "Partager"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
