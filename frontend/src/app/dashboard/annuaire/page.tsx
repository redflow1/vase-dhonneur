"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Search, Users, Phone, Mail } from "lucide-react";
import { ROLE_LABELS } from "@/lib/modules";

interface Member {
  id: string; firstName: string; lastName: string; role: string; phone?: string; email?: string;
  tribe?: { id: string; name: string } | null;
  departments?: { id: string; name: string }[];
}

export default function AnnuairePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTribe, setFilterTribe] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [tribes, setTribes] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterTribe) params.set("tribeId", filterTribe);
      if (filterDept) params.set("departmentId", filterDept);
      const res = await apiFetch(`/membres/annuaire?${params}`);
      setMembers(res.data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    apiFetch("/tribes").then(r => setTribes(r.data ?? [])).catch(() => {});
    apiFetch("/departments").then(r => setDepartments(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [filterTribe, filterDept]);

  const filtered = members.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return m.firstName.toLowerCase().includes(q) || m.lastName.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
  });

  if (authLoading) return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;

  return (
    <div>
      <PageHeader title="Annuaire" subtitle="Trouvez les membres de l'église" />

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold" />
        </div>
        <select value={filterTribe} onChange={(e) => setFilterTribe(e.target.value)} className="px-3 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold">
          <option value="">Toutes les tribus</option>
          {tribes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="px-3 py-2.5 rounded-xl bg-input-bg border border-input-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-gold">
          <option value="">Tous les départements</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted"><Users className="w-10 h-10 mx-auto mb-3 opacity-50" /><p>Aucun membre trouvé</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((m) => (
            <div key={m.id} className="bg-card-bg border border-card-border rounded-2xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-teal-deep text-white flex items-center justify-center font-bold text-sm">{m.firstName[0]}{m.lastName[0]}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-muted">{ROLE_LABELS[m.role as keyof typeof ROLE_LABELS] ?? m.role}</p>
                </div>
              </div>
              {m.tribe && <p className="text-xs text-teal-deep mb-1">Tribu : {m.tribe.name}</p>}
              {m.departments && m.departments.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {m.departments.map((d) => <span key={d.id} className="text-[10px] bg-teal-muted text-teal-deep rounded-full px-2 py-0.5">{d.name}</span>)}
                </div>
              )}
              <div className="space-y-1 text-xs text-muted">
                {m.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{m.phone}</p>}
                {m.email && <p className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" />{m.email}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
