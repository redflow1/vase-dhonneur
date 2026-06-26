"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import SearchInput from "@/components/ui/SearchInput";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Lock, Plus, Pencil, Trash2, Bell } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Member {
  id: string;
  prenom: string;
  nom: string;
  notesCount: number;
}

interface PastoralNote {
  id: string;
  content: string;
  date: string;
  reminderDate?: string;
  auteur?: string;
}

interface Rappel {
  id: string;
  content: string;
  reminderDate: string;
  memberId: string;
  memberName: string;
}

export default function PastoralPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: membresResponse, loading: membresLoading } = useApi<{ data: Member[]; pagination?: unknown }>("/membres?minimal=true");
  const membres = membresResponse?.data ?? [];
  const { data: rappelsResponse, loading: rappelsLoading, refetch: refetchRappels } = useApi<{ data: Rappel[] }>("/pastoral/rappels");
  const rappels = rappelsResponse?.data ?? [];

  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [notes, setNotes] = useState<PastoralNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);

  // Note modal (add/edit)
  const [noteOpen, setNoteOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<PastoralNote | null>(null);
  const [noteForm, setNoteForm] = useState({ content: "", reminderDate: "" });
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const [noteError, setNoteError] = useState("");

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState("");

  const isPasteur = user?.role === "PASTEUR" || user?.role === "SUPER_ADMIN";

  const filteredMembers = useMemo(() => {
    if (!search) return membres;
    const q = search.toLowerCase();
    return membres.filter(
      (m) =>
        m.prenom.toLowerCase().includes(q) ||
        m.nom.toLowerCase().includes(q)
    );
  }, [membres, search]);

  const loadNotes = async (memberId: string) => {
    setNotesLoading(true);
    try {
      const result = await apiFetch(`/pastoral/${memberId}`);
      setNotes(result);
    } catch {
      setNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    loadNotes(member.id);
  };

  const openAddNote = () => {
    setEditingNote(null);
    setNoteForm({ content: "", reminderDate: "" });
    setNoteError("");
    setNoteOpen(true);
  };

  const openEditNote = (note: PastoralNote) => {
    setEditingNote(note);
    setNoteForm({
      content: note.content,
      reminderDate: note.reminderDate ? note.reminderDate.split("T")[0] : "",
    });
    setNoteError("");
    setNoteOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setNoteSubmitting(true);
    setNoteError("");
    try {
      if (editingNote) {
        await apiFetch(`/pastoral/${editingNote.id}`, {
          method: "PUT",
          body: JSON.stringify(noteForm),
        });
      } else {
        await apiFetch(`/pastoral/${selectedMember.id}`, {
          method: "POST",
          body: JSON.stringify(noteForm),
        });
      }
      setNoteOpen(false);
      loadNotes(selectedMember.id);
      refetchRappels();
    } catch (err: any) {
      setNoteError(err.message || "Erreur");
    } finally {
      setNoteSubmitting(false);
    }
  };

  const openDelete = (noteId: string) => {
    setDeletingNoteId(noteId);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await apiFetch(`/pastoral/${deletingNoteId}`, { method: "DELETE" });
      setDeleteOpen(false);
      if (selectedMember) loadNotes(selectedMember.id);
      refetchRappels();
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

  if (!isPasteur) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Lock size={48} className="text-red-500" />
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">Accès réservé au pasteur</p>
          <p className="text-sm text-muted mt-1">Ce module est confidentiel et accessible uniquement au pasteur.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Suivi Pastoral"
        subtitle="Notes confidentielles et accompagnement des membres"
        action={
          <Badge label="CONFIDENTIEL" variant="danger" />
        }
      />

      {/* Rappels */}
      {!rappelsLoading && rappels.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gold-muted border border-gold/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-gold" />
            <span className="font-semibold text-gold text-sm">
              {rappels.length} rappel{rappels.length > 1 ? "s" : ""} à venir
            </span>
          </div>
          <div className="space-y-2">
            {rappels.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-card-bg border border-gold/20 px-4 py-2.5 cursor-pointer hover:bg-teal-muted transition-colors"
                onClick={() => {
                  const member = membres?.find((m) => m.id === r.memberId);
                  if (member) handleSelectMember(member);
                }}
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{r.memberName}</p>
                  <p className="text-xs text-muted line-clamp-1">{r.content}</p>
                </div>
                <span className="text-xs text-gold font-medium flex-shrink-0">
                  {format(parseISO(r.reminderDate), "dd/MM/yyyy")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex gap-4 h-[calc(100vh-16rem)] min-h-[400px]">
        {/* Left: member list */}
        <div className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-card-bg border border-card-border overflow-hidden">
          <div className="p-3 border-b border-card-border">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un membre…"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {membresLoading ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
            ) : filteredMembers.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">Aucun membre trouvé</p>
            ) : (
              filteredMembers.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelectMember(m)}
                  className={`w-full text-left px-4 py-3 border-b border-card-border last:border-0 transition-colors ${
                    selectedMember?.id === m.id
                      ? "bg-teal-muted text-teal-deep"
                      : "hover:bg-teal-muted/50 text-foreground"
                  }`}
                >
                  <p className="text-sm font-medium">{m.prenom} {m.nom}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {m.notesCount} note{m.notesCount !== 1 ? "s" : ""}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: notes panel */}
        <div className="flex-1 flex flex-col rounded-2xl bg-card-bg border border-card-border overflow-hidden">
          {!selectedMember ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-muted">
              <Lock size={36} />
              <p className="text-sm">Sélectionnez un membre pour voir ses notes pastorales</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
                <div>
                  <p className="font-semibold text-foreground">{selectedMember.prenom} {selectedMember.nom}</p>
                  <p className="text-xs text-muted">Notes pastorales confidentielles</p>
                </div>
                <button
                  onClick={openAddNote}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-deep text-white text-xs font-medium hover:bg-teal-light transition-colors"
                >
                  <Plus size={14} />
                  Ajouter une note
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {notesLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
                ) : notes.length === 0 ? (
                  <EmptyState
                    icon={<Lock size={32} />}
                    title="Aucune note pour ce membre"
                    description="Cliquez sur 'Ajouter une note' pour commencer."
                  />
                ) : (
                  [...notes].sort((a, b) => b.date > a.date ? 1 : -1).map((note) => (
                    <div key={note.id} className="rounded-xl border border-card-border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-foreground leading-relaxed flex-1">{note.content}</p>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => openEditNote(note)}
                            className="p-1.5 rounded-lg hover:bg-teal-muted transition-colors text-muted hover:text-foreground"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openDelete(note.id)}
                            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-muted hover:text-red-500"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                        <span>{note.date ? format(parseISO(note.date), "dd/MM/yyyy") : "—"}</span>
                        {note.reminderDate && (
                          <span className="flex items-center gap-1 text-gold">
                            <Bell size={11} />
                            Rappel : {format(parseISO(note.reminderDate), "dd/MM/yyyy")}
                          </span>
                        )}
                        {note.auteur && <span>Par : {note.auteur}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal : Note */}
      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title={editingNote ? "Modifier la note" : "Ajouter une note pastorale"}
        size="md"
      >
        <form onSubmit={handleSaveNote} className="space-y-4">
          {noteError && <p className="text-sm text-red-500">{noteError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Note <span className="text-red-500">*</span></label>
            <textarea
              required
              rows={6}
              value={noteForm.content}
              onChange={(e) => setNoteForm((p) => ({ ...p, content: e.target.value }))}
              placeholder="Observations pastorales, situation, besoins, suivi…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Date de rappel</label>
            <input
              type="date"
              value={noteForm.reminderDate}
              onChange={(e) => setNoteForm((p) => ({ ...p, reminderDate: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setNoteOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={noteSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {noteSubmitting ? "Enregistrement…" : editingNote ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>

      {/* ConfirmDialog : Supprimer */}
      <ConfirmDialog
        open={deleteOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
        title="Supprimer la note"
        message="Cette note pastorale sera définitivement supprimée. Cette action est irréversible."
        danger
      />
    </div>
  );
}
