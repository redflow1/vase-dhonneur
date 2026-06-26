"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/auth";
import PageHeader from "@/components/ui/PageHeader";
import TabBar from "@/components/ui/TabBar";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import SearchInput from "@/components/ui/SearchInput";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { Music, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Song {
  id: string;
  title: string;
  artist: string;
  key: string;
  lyrics?: string;
}

interface SetlistMusician {
  id: string;
  nom: string;
  instrument: string;
  notifie: boolean;
}

interface Setlist {
  id: string;
  date: string;
  songs?: Song[];
  musicians?: SetlistMusician[];
}

interface MusicianRow {
  id: string;
  nom: string;
  instrument: string;
  setlistDate: string;
  notifie: boolean;
}

const TABS = ["Bibliothèque", "Setlists", "Musiciens"];

export default function LouangePage() {
  const { isLoading: authLoading } = useAuth();
  const { data: songsData, loading: songsLoading, error: songsError, refetch: refetchSongs } = useApi<{ data: Song[] }>("/louange/songs");
  const { data: setlistsData, loading: setlistsLoading, refetch: refetchSetlists } = useApi<{ data: Setlist[] }>("/louange/setlists");

  const songs = songsData?.data ?? [];
  const setlists = setlistsData?.data ?? [];

  const [tab, setTab] = useState("Bibliothèque");
  const [search, setSearch] = useState("");
  const [expandedSong, setExpandedSong] = useState<string | null>(null);
  const [expandedSetlist, setExpandedSetlist] = useState<string | null>(null);

  // Add song modal
  const [songModalOpen, setSongModalOpen] = useState(false);
  const [songForm, setSongForm] = useState({ title: "", artist: "", key: "", lyrics: "" });
  const [songSubmitting, setSongSubmitting] = useState(false);
  const [songError, setSongError] = useState("");

  // Add setlist modal
  const [setlistModalOpen, setSetlistModalOpen] = useState(false);
  const [setlistForm, setSetlistForm] = useState({ date: "" });
  const [setlistSubmitting, setSetlistSubmitting] = useState(false);
  const [setlistError, setSetlistError] = useState("");

  const filteredSongs = useMemo(() => {
    if (!songs.length) return [];
    const q = search.toLowerCase();
    if (!q) return songs;
    return songs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.artist || "").toLowerCase().includes(q) ||
        (s.key || "").toLowerCase().includes(q)
    );
  }, [songs, search]);

  const musicianRows: MusicianRow[] = useMemo(() => {
    if (!setlists.length) return [];
    const rows: MusicianRow[] = [];
    setlists.forEach((sl) => {
      (sl.musicians ?? []).forEach((m) => {
        rows.push({
          id: `${sl.id}-${m.id}`,
          nom: m.nom,
          instrument: m.instrument,
          setlistDate: sl.date,
          notifie: m.notifie,
        });
      });
    });
    return rows;
  }, [setlists]);

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setSongSubmitting(true);
    setSongError("");
    try {
      await apiFetch("/louange/songs", { method: "POST", body: JSON.stringify(songForm) });
      setSongModalOpen(false);
      setSongForm({ title: "", artist: "", key: "", lyrics: "" });
      refetchSongs();
    } catch (err: any) {
      setSongError(err.message || "Erreur");
    } finally {
      setSongSubmitting(false);
    }
  };

  const handleAddSetlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetlistSubmitting(true);
    setSetlistError("");
    try {
      await apiFetch("/louange/setlists", { method: "POST", body: JSON.stringify(setlistForm) });
      setSetlistModalOpen(false);
      setSetlistForm({ date: "" });
      refetchSetlists();
    } catch (err: any) {
      setSetlistError(err.message || "Erreur");
    } finally {
      setSetlistSubmitting(false);
    }
  };

  const musicianCols = [
    { key: "nom", label: "Nom" },
    { key: "instrument", label: "Instrument" },
    {
      key: "setlistDate",
      label: "Date setlist",
      render: (v: string) => (v ? format(parseISO(v), "dd/MM/yyyy") : "—"),
    },
    {
      key: "notifie",
      label: "Notifié",
      render: (v: boolean) => (
        <Badge label={v ? "Oui" : "Non"} variant={v ? "success" : "default"} />
      ),
    },
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
        title="Setlist & Musiciens"
        subtitle="Bibliothèque de chants, setlists et planning des musiciens"
      />

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="mt-4">
        {/* ── Bibliothèque ── */}
        {tab === "Bibliothèque" && (
          <>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="flex-1 max-w-sm">
                <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un chant…" />
              </div>
              <button
                onClick={() => setSongModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors self-start"
              >
                <Plus size={16} />
                Ajouter un chant
              </button>
            </div>

            {songsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : filteredSongs.length === 0 ? (
              <EmptyState icon={<Music size={40} />} title="Aucun chant trouvé" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSongs.map((song) => (
                  <div
                    key={song.id}
                    className="rounded-2xl bg-card-bg border border-card-border overflow-hidden"
                  >
                    <div
                      className="flex items-start justify-between gap-2 p-4 cursor-pointer hover:bg-teal-muted transition-colors"
                      onClick={() =>
                        setExpandedSong(expandedSong === song.id ? null : song.id)
                      }
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{song.title}</p>
                        <p className="text-xs text-muted truncate">{song.artist || "—"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {song.key && (
                          <Badge label={song.key} variant="info" />
                        )}
                        {expandedSong === song.id ? (
                          <ChevronUp size={16} className="text-muted" />
                        ) : (
                          <ChevronDown size={16} className="text-muted" />
                        )}
                      </div>
                    </div>
                    {expandedSong === song.id && song.lyrics && (
                      <div className="px-4 pb-4 border-t border-card-border">
                        <p className="text-xs text-muted mt-3 whitespace-pre-wrap leading-relaxed">
                          {song.lyrics}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Setlists ── */}
        {tab === "Setlists" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSetlistModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
              >
                <Plus size={16} />
                Nouvelle setlist
              </button>
            </div>

            {setlistsLoading ? (
              <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
            ) : setlists.length === 0 ? (
              <EmptyState icon={<Music size={40} />} title="Aucune setlist créée" />
            ) : (
              <div className="space-y-3">
                {setlists.map((sl) => (
                  <div key={sl.id} className="rounded-2xl bg-card-bg border border-card-border overflow-hidden">
                    <div
                      className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-teal-muted transition-colors"
                      onClick={() =>
                        setExpandedSetlist(expandedSetlist === sl.id ? null : sl.id)
                      }
                    >
                      <p className="font-semibold text-foreground">
                        Setlist du{" "}
                        {sl.date ? format(parseISO(sl.date), "dd/MM/yyyy") : "—"}
                      </p>
                      {expandedSetlist === sl.id ? (
                        <ChevronUp size={16} className="text-muted" />
                      ) : (
                        <ChevronDown size={16} className="text-muted" />
                      )}
                    </div>
                    {expandedSetlist === sl.id && (
                      <div className="px-5 pb-5 border-t border-card-border grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                        <div>
                          <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Chants</p>
                          {sl.songs && sl.songs.length > 0 ? (
                            <ol className="space-y-1.5">
                              {sl.songs.map((s, idx) => (
                                <li key={s.id} className="flex items-center gap-2 text-sm">
                                  <span className="w-5 text-muted font-mono text-xs">{idx + 1}.</span>
                                  <span className="text-foreground font-medium">{s.title}</span>
                                  {s.key && (
                                    <Badge label={s.key} variant="info" />
                                  )}
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-sm text-muted">Aucun chant</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted mb-2 uppercase tracking-wide">Musiciens</p>
                          {sl.musicians && sl.musicians.length > 0 ? (
                            <ul className="space-y-1.5">
                              {sl.musicians.map((m) => (
                                <li key={m.id} className="flex items-center justify-between text-sm">
                                  <span className="text-foreground">{m.nom}</span>
                                  <span className="text-muted text-xs">{m.instrument}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-muted">Aucun musicien</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Musiciens ── */}
        {tab === "Musiciens" && (
          <DataTable columns={musicianCols} data={musicianRows} loading={setlistsLoading} />
        )}
      </div>

      {/* Add song modal */}
      <Modal open={songModalOpen} onClose={() => setSongModalOpen(false)} title="Ajouter un chant" size="md">
        <form onSubmit={handleAddSong} className="space-y-4">
          {songError && <p className="text-sm text-red-500">{songError}</p>}
          {(
            [
              ["title", "Titre", "text", true],
              ["artist", "Artiste", "text", false],
              ["key", "Tonalité (ex: Do, Sol#…)", "text", false],
            ] as [string, string, string, boolean][]
          ).map(([key, label, type, required]) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted mb-1">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={type}
                required={required}
                value={(songForm as any)[key]}
                onChange={(e) => setSongForm((p) => ({ ...p, [key]: e.target.value }))}
                className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Paroles</label>
            <textarea
              rows={6}
              value={songForm.lyrics}
              onChange={(e) => setSongForm((p) => ({ ...p, lyrics: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40 resize-y"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSongModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={songSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {songSubmitting ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add setlist modal */}
      <Modal open={setlistModalOpen} onClose={() => setSetlistModalOpen(false)} title="Nouvelle setlist" size="sm">
        <form onSubmit={handleAddSetlist} className="space-y-4">
          {setlistError && <p className="text-sm text-red-500">{setlistError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={setlistForm.date}
              onChange={(e) => setSetlistForm({ date: e.target.value })}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setSetlistModalOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={setlistSubmitting}
              className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50"
            >
              {setlistSubmitting ? "Création…" : "Créer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
