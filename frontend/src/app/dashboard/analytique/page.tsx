"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Users, UserPlus, Wallet, Network } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell as RCell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = { primary: "#1A6B5C", secondary: "#2D8B78", accent: "#C9940A", light: "#F5D070" };

interface KPIs {
  membresActifs: number;
  visiteurs: number;
  donsTotal: number;
  cellules: number;
}

interface PresenceData {
  semaine: string;
  presences: number;
}

interface CroissanceData {
  mois: string;
  nouveauxMembres: number;
}

interface ConversionData {
  etape: string;
  count: number;
}

interface DonsTypeData {
  type: string;
  montant: number;
}

const FUNNEL_COLORS = [COLORS.primary, COLORS.secondary, "#4CAF50", COLORS.accent, COLORS.light];
const PIE_COLORS: Record<string, string> = {
  DIME: COLORS.primary,
  OFFRANDE: COLORS.accent,
  DON_SPECIAL: COLORS.secondary,
};

export default function AnalytiquePage() {
  const { isLoading: authLoading } = useAuth();
  const { data: kpis, loading: kpisLoading } = useApi<KPIs>("/analytique/kpis");
  const { data: presences, loading: presencesLoading } = useApi<PresenceData[]>("/analytique/presences");
  const { data: croissance, loading: croissanceLoading } = useApi<CroissanceData[]>("/analytique/croissance");
  const { data: conversion, loading: conversionLoading } = useApi<ConversionData[]>("/analytique/conversion");
  const { data: donsType, loading: donsTypeLoading } = useApi<DonsTypeData[]>("/analytique/dons-types");

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
        title="Tableau de bord analytique"
        subtitle="Vue d'ensemble des indicateurs clés de l'église"
      />

      {/* KPIs Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-card-bg border border-card-border p-5 h-28 animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              title="Membres actifs"
              value={kpis?.membresActifs ?? "—"}
              icon={<Users size={22} />}
              subtitle="Membres en règle"
            />
            <StatCard
              title="Visiteurs"
              value={kpis?.visiteurs ?? "—"}
              icon={<UserPlus size={22} />}
              subtitle="Ce mois-ci"
            />
            <StatCard
              title="Dons totaux"
              value={kpis?.donsTotal != null ? `${kpis.donsTotal.toLocaleString("fr-FR")} FCFA` : "—"}
              icon={<Wallet size={22} />}
              subtitle="Ce mois-ci"
            />
            <StatCard
              title="Cellules"
              value={kpis?.cellules ?? "—"}
              icon={<Network size={22} />}
              subtitle="Groupes actifs"
            />
          </>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Presences chart */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Présences hebdomadaires (12 dernières semaines)</h3>
          {presencesLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : !presences || presences.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={presences}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="semaine" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="presences" name="Présences" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Croissance chart */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Croissance des membres (12 derniers mois)</h3>
          {croissanceLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : !croissance || croissance.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={croissance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="nouveauxMembres"
                  name="Nouveaux membres"
                  stroke={COLORS.accent}
                  strokeWidth={2.5}
                  dot={{ fill: COLORS.accent, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entonnoir de conversion */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Entonnoir de conversion</h3>
          {conversionLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : !conversion || conversion.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune donnée disponible</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxCount = Math.max(...conversion.map((c) => c.count), 1);
                return conversion.map((item, i) => {
                  const pct = Math.max((item.count / maxCount) * 100, 6);
                  return (
                    <div key={item.etape} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-muted text-right flex-shrink-0">{item.etape}</div>
                      <div className="flex-1 h-8 rounded-lg bg-teal-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-lg flex items-center justify-end pr-2 transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: FUNNEL_COLORS[i % FUNNEL_COLORS.length],
                          }}
                        >
                          <span className="text-xs font-semibold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Dons par type */}
        <div className="rounded-2xl bg-card-bg border border-card-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Dons par type</h3>
          {donsTypeLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : !donsType || donsType.length === 0 ? (
            <p className="text-sm text-muted text-center py-8">Aucune donnée disponible</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={donsType}
                  dataKey="montant"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ payload, percent }: any) =>
                    `${payload.type} ${Math.round((percent ?? 0) * 100)}%`
                  }
                >
                  {donsType.map((entry) => (
                    <RCell
                      key={entry.type}
                      fill={PIE_COLORS[entry.type] ?? COLORS.secondary}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v?.toLocaleString("fr-FR")} FCFA`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
