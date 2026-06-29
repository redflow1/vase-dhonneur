"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Users, Calendar, DollarSign, CheckSquare } from "lucide-react";

export default function RapportsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    (async () => {
      try {
        const [membres, events, tasks, dons] = await Promise.all([
          apiFetch("/membres/annuaire").catch(() => ({ data: [] })),
          apiFetch("/evenements").catch(() => ({ data: [] })),
          apiFetch("/tasks").catch(() => ({ data: [] })),
          apiFetch("/finances/dons").catch(() => ({ data: [] })),
        ]);
        setStats({
          totalMembres: (membres.data ?? []).length,
          totalEvenements: (events.data ?? []).length,
          totalTaches: (tasks.data ?? []).length,
          totalDons: (dons.data ?? []).reduce((s: number, d: any) => s + d.amount, 0) ?? 0,
          tachesTerminees: (tasks.data ?? []).filter((t: any) => t.status === "Terminé").length,
          evenementsFuturs: (events.data ?? []).filter((e: any) => new Date(e.startDate) > new Date()).length,
          membresParRole: {} as Record<string, number>,
          donsParType: {} as Record<string, number>,
          evenementsParType: {} as Record<string, number>,
        });
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  const cards = [
    { label: "Membres", value: stats.totalMembres, icon: Users, color: "text-blue-500" },
    { label: "Événements", value: stats.totalEvenements, icon: Calendar, color: "text-purple-500" },
    { label: "Tâches", value: stats.totalTaches, sub: `${stats.tachesTerminees} terminées`, icon: CheckSquare, color: "text-green-500" },
    { label: "Dons total", value: `${(stats.totalDons ?? 0).toLocaleString()} F`, icon: DollarSign, color: "text-amber-500" },
  ];

  return (
    <div>
      <PageHeader title="Rapports d'Activité" subtitle="Vue d'ensemble de l'église" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c) => (
          <div key={c.label} className="bg-card-bg border border-card-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2.5 rounded-xl bg-teal-muted ${c.color}`}><c.icon className="w-5 h-5" /></div>
            </div>
            <p className="text-2xl font-bold text-foreground">{c.value}</p>
            <p className="text-xs text-muted mt-1">{c.label}</p>
            {c.sub && <p className="text-[10px] text-green-600 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card-bg border border-card-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Activité récente</h3>
          <ul className="space-y-2 text-sm text-foreground">
            <li className="flex justify-between py-1 border-b border-card-border"><span>Événements futurs</span><span className="font-semibold">{stats.evenementsFuturs ?? 0}</span></li>
            <li className="flex justify-between py-1 border-b border-card-border"><span>Événements passés</span><span className="font-semibold">{(stats.totalEvenements ?? 0) - (stats.evenementsFuturs ?? 0)}</span></li>
            <li className="flex justify-between py-1 border-b border-card-border"><span>Taux complétion tâches</span><span className="font-semibold">{stats.totalTaches > 0 ? Math.round((stats.tachesTerminees ?? 0) / stats.totalTaches * 100) : 0}%</span></li>
          </ul>
        </div>

        <div className="bg-card-bg border border-card-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground text-sm mb-4">Légende</h3>
          <p className="text-xs text-muted leading-relaxed">
            Cette page agrège les données de tous les modules pour donner une vue d'ensemble de l'activité de l'église.
            Les chiffres sont mis à jour en temps réel à chaque chargement de la page.
          </p>
        </div>
      </div>
    </div>
  );
}
