"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import EmptyState from "@/components/ui/EmptyState";
import MemberAvatar from "@/components/MemberAvatar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { BookOpen, Megaphone, CheckSquare, Users, Cake } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Verset {
  texte: string;
  reference: string;
}

interface Annonce {
  id: string;
  title: string;
  createdAt: string;
}

interface PlanLecture {
  id: string;
  title: string;
  totalDays: number;
  progress?: { completedDays: number; done: boolean } | null;
}

interface Presence {
  id: string;
  date: string;
  serviceType?: string;
}

interface Anniversaire {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  photoUrl?: string;
}

export default function EspacePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: versetData, loading: vLoading } = useApi<{ verset: Verset | null }>("/espace/verset");
  const { data: annoncesData, loading: aLoading } = useApi<{ data: Annonce[] }>("/espace/annonces");
  const { data: planData, loading: pLoading, refetch: refetchPlan } = useApi<{ data: PlanLecture[] }>("/espace/plan-lecture");
  const { data: presencesData, loading: presLoading } = useApi<{ data: Presence[] }>("/espace/presences");
  const { data: anniversairesData, loading: aniLoading } = useApi<{ data: Anniversaire[] }>("/espace/anniversaires");

  const verset = versetData?.verset ?? null;
  const annonces = annoncesData?.data ?? [];
  const plan = planData?.data?.[0] ?? null;
  const presences = presencesData?.data ?? [];
  const anniversaires = anniversairesData?.data ?? [];

  const [markingDay, setMarkingDay] = useState(false);

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Mon Espace</h1>
        {user && (
          <p className="text-sm text-muted mt-1">
            Bonjour, {user.firstName} — {user.churchName}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Verset du jour */}
        <div className="rounded-2xl bg-card-bg border-2 border-gold p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-gold" />
            <span className="text-sm font-semibold text-gold">Verset du jour</span>
          </div>
          {vLoading ? (
            <LoadingSpinner />
          ) : verset ? (
            <>
              <p className="text-base italic text-foreground leading-relaxed">
                &ldquo;{verset.texte}&rdquo;
              </p>
              <p className="text-sm font-semibold text-gold text-right">{verset.reference}</p>
            </>
          ) : (
            <EmptyState
              icon={<BookOpen size={32} />}
              title="Aucun verset disponible"
            />
          )}
        </div>

        {/* Annonces */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <Megaphone size={18} className="text-teal-deep" />
            <span className="text-sm font-semibold text-foreground">Dernières annonces</span>
          </div>
          {aLoading ? (
            <LoadingSpinner />
          ) : annonces && annonces.length > 0 ? (
            <ul className="space-y-2">
              {annonces.slice(0, 5).map((a) => (
                <li key={a.id} className="flex justify-between items-start gap-2 text-sm">
                  <span className="text-foreground font-medium">{a.title}</span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {a.createdAt ? format(parseISO(a.createdAt), "dd/MM") : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Megaphone size={28} />} title="Aucune annonce" />
          )}
        </div>

        {/* Plan de lecture */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={18} className="text-teal-deep" />
            <span className="text-sm font-semibold text-foreground">Plan de lecture</span>
          </div>
          {pLoading ? (
            <LoadingSpinner />
          ) : plan ? (
            <>
              <p className="font-medium text-foreground">{plan.title}</p>
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
            </>
          ) : (
            <EmptyState icon={<CheckSquare size={28} />} title="Aucun plan de lecture actif" />
          )}
        </div>

        {/* Mes présences */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={18} className="text-teal-deep" />
            <span className="text-sm font-semibold text-foreground">Mes présences récentes</span>
          </div>
          {presLoading ? (
            <LoadingSpinner />
          ) : presences && presences.length > 0 ? (
            <ul className="space-y-2">
              {presences.slice(0, 10).map((p) => (
                <li key={p.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{p.serviceType ?? "Culte"}</span>
                  <span className="text-muted text-xs">
                    {p.date ? format(parseISO(p.date), "dd/MM/yyyy") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<CheckSquare size={28} />} title="Aucune présence enregistrée" />
          )}
        </div>

        {/* Anniversaires cette semaine */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-6 flex flex-col gap-3 md:col-span-2">
          <div className="flex items-center gap-2 mb-1">
            <Cake size={18} className="text-gold" />
            <span className="text-sm font-semibold text-foreground">Anniversaires cette semaine</span>
          </div>
          {aniLoading ? (
            <LoadingSpinner />
          ) : anniversaires && anniversaires.length > 0 ? (
            <div className="flex flex-wrap gap-4">
              {anniversaires.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-xl border border-card-border bg-card-bg px-4 py-3 min-w-48"
                >
                  <MemberAvatar
                    name={`${a.firstName} ${a.lastName}`}
                    photoUrl={a.photoUrl}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {a.firstName} {a.lastName}
                    </p>
                    <p className="text-xs text-gold">
                      <Cake size={11} className="inline mr-1" />
                      {a.birthDate ? format(parseISO(a.birthDate), "dd MMMM") : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Cake size={28} />}
              title="Aucun anniversaire cette semaine"
            />
          )}
        </div>
      </div>
    </div>
  );
}
