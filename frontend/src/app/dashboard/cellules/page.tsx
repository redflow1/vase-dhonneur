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
import { Users, Plus, ChevronDown, ChevronUp, FileText, BarChart2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface Meeting {
  id: string;
  date: string;
  location?: string;
  topic: string;
  attendeeIds?: string[];
  minutes?: string;
}

interface Cellule {
  id: string;
  name: string;
  description?: string;
  leader?: Member;
  _count?: { members: number; meetings: number };
  memberCount?: number;
  members?: Member[];
  meetings?: Meeting[];
}

interface RapportCellule {
  id: string;
  name: string;
  leader?: Member;
  totalMembers: number;
  meetingCount: number;
  avgAttendance: number;
}

export default function CellulesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: cellulesData, loading, error, refetch } = useApi<{ data: Cellule[] }>("/cellules");
  const { data: rapportData, loading: rapportLoading } = useApi<{ data: RapportCellule[] }>("/cellules/rapport-mensuel");
  const { data: allMembresData } = useApi<{ data: Member[] }>("/membres?minimal=true");

  const cellules = cellulesData?.data ?? [];
  const rapport = rapportData?.data ?? [];
  const allMembers = allMembresData?.data ?? [];

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [celluleDetails, setCelluleDetails] = useState<Record<string, { members: Member[]; meetings: Meeting[] }>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  // Nouvelle cellule modal
  const [newCelluleOpen, setNewCelluleOpen] = useState(false);
  const [newCelluleForm, setNewCelluleForm] = useState({ name: "", description: "", leaderId: "" });
  const [newCelluleSubmitting, setNewCelluleSubmitting] = useState(false);
  const [newCelluleError, setNewCelluleError] = useState("");

  // Reunion modal
  const [reunionOpen, setReunionOpen] = useState(false);
  const [reunionCelluleId, setReunionCelluleId] = useState("");
  const [reunionForm, setReunionForm] = useState({ date: "", location: "", topic: "", attendeeIds: [] as string[] });
  const [reunionCelluleMembers, setReunionCelluleMembers] = useState<Member[]>([]);
  const [reunionSubmitting, setReunionSubmitting] = useState(false);
  const [reunionError, setReunionError] = useState("");

  // PV modal
  const [pvOpen, setPvOpen] = useState(false);
  const [pvCelluleId, setPvCelluleId] = useState("");
  const [pvMeetingId, setPvMeetingId] = useState("");
  const [pvContent, setPvContent] = useState("");
  const [pvSubmitting, setPvSubmitting] = useState(false);
  const [pvError, setPvError] = useState("");

  const handleExpand = async (cellule: Cellule) => {
    if (expandedId === cellule.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(cellule.id);
    if (!celluleDetails[cellule.id]) {
      setDetailLoading(cellule.id);
      try {
        const result = await apiFetch(`/cellules/${cellule.id}`);
        const cell = result?.cell ?? result;
        setCelluleDetails((p) => ({
          ...p,
          [cellule.id]: {
            members: cell?.members ?? [],
            meetings: cell?.meetings ?? [],
          },
        }));
      } catch {
        setCelluleDetails((p) => ({ ...p, [cellule.id]: { members: [], meetings: [] } }));
      } finally {
        setDetailLoading(null);
      }
    }
  };

  const openReunion = (cellule: Cellule) => {
    setReunionCelluleId(cellule.id);
    setReunionForm({ date: "", location: "", topic: "", attendeeIds: [] });
    setReunionCelluleMembers(celluleDetails[cellule.id]?.members ?? cellule.members ?? []);
    setReunionError("");
    setReunionOpen(true);
  };

  const toggleAttendee = (id: string) => {
    setReunionForm((p) => ({
      ...p,
      attendeeIds: p.attendeeIds.includes(id)
        ? p.attendeeIds.filter((x) => x !== id)
        : [...p.attendeeIds, id],
    }));
  };

  const handleReunion = async (e: React.FormEvent) => {
    e.preventDefault();
    setReunionSubmitting(true);
    setReunionError("");
    try {
      await apiFetch(`/cellules/${reunionCelluleId}/meetings`, {
        method: "POST",
        body: JSON.stringify(reunionForm),
      });
      setReunionOpen(false);
      // Refresh detail
      const result = await apiFetch(`/cellules/${reunionCelluleId}`);
      const cell = result?.cell ?? result;
      setCelluleDetails((p) => ({
        ...p,
        [reunionCelluleId]: { ...p[reunionCelluleId], meetings: cell?.meetings ?? [] },
      }));
    } catch (err: any) {
      setReunionError(err.message || "Erreur");
    } finally {
      setReunionSubmitting(false);
    }
  };

  const openPv = (celluleId: string, meetingId: string, existingMinutes?: string) => {
    setPvCelluleId(celluleId);
    setPvMeetingId(meetingId);
    setPvContent(existingMinutes ?? "");
    setPvError("");
    setPvOpen(true);
  };

  const handlePv = async (e: React.FormEvent) => {
    e.preventDefault();
    setPvSubmitting(true);
    setPvError("");
    try {
      await apiFetch(`/cellules/${pvCelluleId}/meetings/${pvMeetingId}`, {
        method: "PUT",
        body: JSON.stringify({ minutes: pvContent }),
      });
      setPvOpen(false);
      const result = await apiFetch(`/cellules/${pvCelluleId}`);
      const cell = result?.cell ?? result;
      setCelluleDetails((p) => ({
        ...p,
        [pvCelluleId]: { ...p[pvCelluleId], meetings: cell?.meetings ?? [] },
      }));
    } catch (err: any) {
      setPvError(err.message || "Erreur");
    } finally {
      setPvSubmitting(false);
    }
  };

  const handleNewCellule = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewCelluleSubmitting(true);
    setNewCelluleError("");
    try {
      await apiFetch("/cellules", { method: "POST", body: JSON.stringify(newCelluleForm) });
      setNewCelluleOpen(false);
      setNewCelluleForm({ name: "", description: "", leaderId: "" });
      refetch();
    } catch (err: any) {
      setNewCelluleError(err.message || "Erreur");
    } finally {
      setNewCelluleSubmitting(false);
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
        title="Cellules & Réunions"
        subtitle="Gestion des cellules d'église et suivi des réunions"
        action={
          isAdmin ? (
            <button
              onClick={() => setNewCelluleOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
            >
              <Plus size={16} />
              Nouvelle cellule
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Rapport mensuel */}
      {isAdmin && !rapportLoading && rapport.length > 0 && (
        <div className="mb-6 rounded-2xl bg-card-bg border border-card-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-teal-deep" />
            <h3 className="font-semibold text-foreground">Rapport mensuel</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card-border text-left">
                  <th className="pb-2 font-semibold text-muted text-xs uppercase">Cellule</th>
                  <th className="pb-2 font-semibold text-muted text-xs uppercase">Réunions</th>
                  <th className="pb-2 font-semibold text-muted text-xs uppercase">Moy. présences</th>
                  <th className="pb-2 font-semibold text-muted text-xs uppercase">Dernière réunion</th>
                </tr>
              </thead>
              <tbody>
                {rapport.map((r) => (
                  <tr key={r.id} className="border-b border-card-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground">{r.name}</td>
                    <td className="py-2.5 text-foreground">{r.meetingCount}</td>
                    <td className="py-2.5 text-foreground">{r.avgAttendance?.toFixed(1)}</td>
                    <td className="py-2.5 text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cellules list */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : cellules.length === 0 ? (
        <EmptyState icon={<Users size={40} />} title="Aucune cellule" description="Créez une première cellule pour commencer." />
      ) : (
        <div className="space-y-3">
          {cellules.map((cellule) => {
            const detail = celluleDetails[cellule.id];
            const isExpanded = expandedId === cellule.id;

            return (
              <div key={cellule.id} className="rounded-2xl bg-card-bg border border-card-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleExpand(cellule)}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <p className="font-semibold text-foreground">{cellule.name}</p>
                      <Badge label={`${cellule._count?.members ?? cellule.memberCount ?? 0} membres`} variant="info" />
                    </div>
                    {cellule.leader && (
                      <p className="text-xs text-muted mt-0.5">
                        Responsable : {cellule.leader.firstName} {cellule.leader.lastName}
                      </p>
                    )}
                    {cellule.description && (
                      <p className="text-xs text-muted mt-0.5 truncate">{cellule.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); openReunion(cellule); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-card-border bg-card-bg text-xs font-medium text-foreground hover:bg-teal-muted transition-colors"
                    >
                      <Plus size={12} />
                      Réunion
                    </button>
                    <button
                      onClick={() => handleExpand(cellule)}
                      className="p-1.5 rounded-lg hover:bg-teal-muted transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-card-border px-5 py-4 grid md:grid-cols-2 gap-6">
                    {detailLoading === cellule.id ? (
                      <div className="col-span-2 flex justify-center py-8"><LoadingSpinner size="md" /></div>
                    ) : (
                      <>
                        {/* Members */}
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Membres</p>
                          {detail?.members?.length ? (
                            <div className="flex flex-wrap gap-1.5">
                              {detail.members.map((m) => (
                                <span key={m.id} className="text-xs bg-teal-muted text-teal-deep rounded-full px-2.5 py-0.5">
                                  {m.firstName} {m.lastName}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">Aucun membre.</p>
                          )}
                        </div>

                        {/* Meetings */}
                        <div>
                          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Réunions récentes</p>
                          {detail?.meetings?.length ? (
                            <div className="space-y-2">
                              {[...detail.meetings].sort((a, b) => b.date > a.date ? 1 : -1).slice(0, 5).map((m) => (
                                <div key={m.id} className="flex items-start justify-between gap-2 rounded-xl bg-teal-muted/30 px-3 py-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{m.topic}</p>
                                    <p className="text-xs text-muted">
                                      {m.date ? format(parseISO(m.date), "dd/MM/yyyy") : "—"}
                                      {m.location && ` • ${m.location}`}
                                      {" "}&bull; {m.attendeeIds?.length ?? 0} présent{(m.attendeeIds?.length ?? 0) !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    {m.minutes ? (
                                      <Badge label="PV" variant="success" />
                                    ) : (
                                      <Badge label="Sans PV" variant="warning" />
                                    )}
                                    <button
                                      onClick={() => openPv(cellule.id, m.id, m.minutes)}
                                      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-card-border text-xs font-medium text-foreground hover:bg-teal-muted transition-colors"
                                    >
                                      <FileText size={11} />
                                      {m.minutes ? "Modifier PV" : "Ajouter PV"}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted">Aucune réunion enregistrée.</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal : Enregistrer une réunion */}
      <Modal open={reunionOpen} onClose={() => setReunionOpen(false)} title="Enregistrer une réunion" size="md">
        <form onSubmit={handleReunion} className="space-y-4">
          {reunionError && <p className="text-sm text-red-500">{reunionError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Sujet <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={reunionForm.topic}
              onChange={(e) => setReunionForm((p) => ({ ...p, topic: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                required
                value={reunionForm.date}
                onChange={(e) => setReunionForm((p) => ({ ...p, date: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Lieu</label>
              <input
                type="text"
                value={reunionForm.location}
                onChange={(e) => setReunionForm((p) => ({ ...p, location: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
          </div>
          {reunionCelluleMembers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-muted mb-2">Présents</label>
              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-input-border bg-input-bg p-3">
                {reunionCelluleMembers.map((m) => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reunionForm.attendeeIds.includes(m.id)}
                      onChange={() => toggleAttendee(m.id)}
                      className="accent-teal-deep rounded"
                    />
                    <span className="text-sm text-foreground">{m.firstName} {m.lastName}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted mt-1">{reunionForm.attendeeIds.length} sélectionné{reunionForm.attendeeIds.length !== 1 ? "s" : ""}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setReunionOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={reunionSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {reunionSubmitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal : Ajouter PV */}
      <Modal open={pvOpen} onClose={() => setPvOpen(false)} title="Procès-verbal de réunion" size="md">
        <form onSubmit={handlePv} className="space-y-4">
          {pvError && <p className="text-sm text-red-500">{pvError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Contenu du PV <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={8}
              value={pvContent}
              onChange={(e) => setPvContent(e.target.value)}
              placeholder="Résumé des discussions, décisions prises, actions à entreprendre…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setPvOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={pvSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {pvSubmitting ? "Enregistrement…" : "Enregistrer le PV"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal : Nouvelle cellule */}
      <Modal open={newCelluleOpen} onClose={() => setNewCelluleOpen(false)} title="Nouvelle cellule" size="sm">
        <form onSubmit={handleNewCellule} className="space-y-4">
          {newCelluleError && <p className="text-sm text-red-500">{newCelluleError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nom <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={newCelluleForm.name}
              onChange={(e) => setNewCelluleForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Description</label>
            <textarea
              rows={3}
              value={newCelluleForm.description}
              onChange={(e) => setNewCelluleForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Responsable</label>
            <select
              value={newCelluleForm.leaderId}
              onChange={(e) => setNewCelluleForm((p) => ({ ...p, leaderId: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            >
              <option value="">— Sélectionner un responsable —</option>
              {(allMembers ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setNewCelluleOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={newCelluleSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {newCelluleSubmitting ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
