"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import StatCard from "@/components/ui/StatCard";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Globe, Users, Mic, Building2, Share2 } from "lucide-react";
import { format, parseISO } from "date-fns";

const TABS = ["Annuaire", "Sermons partagés", "Vue globale"];

interface Eglise {
  id: string;
  name: string;
  city: string;
  pastor: string;
  memberCount: number;
  foundedDate?: string;
}

interface SharedSermon {
  id: string;
  titre: string;
  predicateur: string;
  egliseName: string;
  date: string;
  audioUrl?: string;
  isShared: boolean;
  isOwned?: boolean;
}

interface GlobalStats {
  totalEglises: number;
  totalMembres: number;
  totalDons: number;
}

interface EgliseKPI {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  visiteurCount: number;
  donTotal: number;
  celluleCount: number;
}

export default function ReseauPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [tab, setTab] = useState("Annuaire");

  const { data: eglisesResp, loading: eglisesLoading } = useApi<{ data: Eglise[] }>("/reseau/eglises");
  const { data: sermonsResp, loading: sermonsLoading, refetch: refetchSermons } = useApi<{ data: SharedSermon[] }>("/reseau/sermons-partages");
  const { data: globalStats, loading: globalLoading } = useApi<GlobalStats>("/reseau/stats-globales");
  const { data: eglisesKPIResp, loading: kpiLoading } = useApi<{ data: EgliseKPI[] }>("/reseau/eglises-kpis");

  const eglises = eglisesResp?.data ?? [];
  const sermons = sermonsResp?.data ?? [];
  const eglisesKPI = eglisesKPIResp?.data ?? [];

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isPasteur = user?.role === "PASTEUR" || isSuperAdmin;

  const handleToggleShare = async (sermon: SharedSermon) => {
    try {
      await apiFetch(`/reseau/sermons/${sermon.id}/partager`, {
        method: "PATCH",
        body: JSON.stringify({ shared: !sermon.isShared }),
      });
      refetchSermons();
    } catch (err: any) {
      alert(err.message || "Erreur");
    }
  };

  const eglisesKPIColumns = [
    { key: "name", label: "Église" },
    { key: "city", label: "Ville" },
    { key: "memberCount", label: "Membres" },
    { key: "visiteurCount", label: "Visiteurs" },
    {
      key: "donTotal",
      label: "Dons (FCFA)",
      render: (v: number) => v?.toLocaleString("fr-FR") ?? "—",
    },
    { key: "celluleCount", label: "Cellules" },
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
        title="Réseau Vases d'Honneur"
        subtitle="Annuaire des églises partenaires et partage de ressources"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Annuaire ── */}
        {tab === "Annuaire" && (
          <>
            {eglisesLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !eglises || eglises.length === 0 ? (
              <EmptyState
                icon={<Globe size={40} />}
                title="Aucune église dans le réseau"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {eglises.map((eglise) => (
                  <div
                    key={eglise.id}
                    className="rounded-2xl bg-card-bg border border-card-border p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{eglise.name}</h3>
                        <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                          <Building2 size={11} />
                          {eglise.city}
                        </p>
                      </div>
                      <Badge label={`${eglise.memberCount} mbr`} variant="info" />
                    </div>

                    <div className="text-xs text-muted space-y-1">
                      <p>Pasteur : <span className="text-foreground font-medium">{eglise.pastor}</span></p>
                      {eglise.foundedDate && (
                        <p>Fondée le : {format(parseISO(eglise.foundedDate), "dd/MM/yyyy")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Sermons partagés ── */}
        {tab === "Sermons partagés" && (
          <>
            {sermonsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : !sermons || sermons.length === 0 ? (
              <EmptyState
                icon={<Mic size={40} />}
                title="Aucun sermon partagé"
                description="Aucune prédication n'a été partagée dans le réseau."
              />
            ) : (
              <div className="space-y-3">
                {sermons.map((sermon) => (
                  <div
                    key={sermon.id}
                    className="rounded-2xl bg-card-bg border border-card-border p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground">{sermon.titre}</h3>
                          {sermon.isShared && (
                            <Badge label="Partagé" variant="success" />
                          )}
                        </div>
                        <div className="text-xs text-muted space-y-0.5">
                          <p>Prédicateur : <span className="text-foreground">{sermon.predicateur}</span></p>
                          <p>Église : <span className="text-foreground">{sermon.egliseName}</span></p>
                          <p>{sermon.date ? format(parseISO(sermon.date), "dd/MM/yyyy") : "—"}</p>
                        </div>
                        {sermon.audioUrl && (
                          <audio
                            controls
                            src={sermon.audioUrl}
                            className="w-full h-8 mt-3"
                          />
                        )}
                      </div>

                      {/* Toggle share button (own sermons, pasteur+) */}
                      {isPasteur && sermon.isOwned && (
                        <button
                          onClick={() => handleToggleShare(sermon)}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            sermon.isShared
                              ? "bg-teal-muted text-teal-deep hover:bg-teal-deep hover:text-white"
                              : "border border-card-border bg-card-bg text-muted hover:bg-teal-muted hover:text-teal-deep"
                          }`}
                        >
                          <Share2 size={12} />
                          {sermon.isShared ? "Partagé" : "Partager"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Vue globale (SUPER_ADMIN only) ── */}
        {tab === "Vue globale" && (
          <>
            {!isSuperAdmin ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
                <Globe size={40} />
                <p className="text-sm">Accès réservé au Super Administrateur</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Global KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {globalLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="rounded-2xl bg-card-bg border border-card-border p-5 h-28 animate-pulse" />
                    ))
                  ) : globalStats ? (
                    <>
                      <StatCard
                        title="Églises du réseau"
                        value={globalStats.totalEglises}
                        icon={<Building2 size={22} />}
                      />
                      <StatCard
                        title="Membres totaux"
                        value={globalStats.totalMembres?.toLocaleString("fr-FR")}
                        icon={<Users size={22} />}
                      />
                      <StatCard
                        title="Dons globaux"
                        value={`${globalStats.totalDons?.toLocaleString("fr-FR")} FCFA`}
                        icon={<Building2 size={22} />}
                      />
                    </>
                  ) : null}
                </div>

                {/* KPIs table */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Indicateurs par église</h3>
                  {kpiLoading ? (
                    <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                  ) : eglisesKPI && eglisesKPI.length > 0 ? (
                    <DataTable columns={eglisesKPIColumns} data={eglisesKPI} />
                  ) : (
                    <p className="text-sm text-muted">Aucune donnée disponible.</p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
