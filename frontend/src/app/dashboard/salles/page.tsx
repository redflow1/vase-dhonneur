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
import { DoorOpen, Plus, CheckCircle, XCircle, Clock } from "lucide-react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";

interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  reservedBy?: string;
  status: "EN_ATTENTE" | "APPROUVE" | "REJETE";
}

interface Salle {
  id: string;
  name: string;
  capacity: number;
  features?: string;
  bookings?: Booking[];
}

const BOOKING_VARIANT: Record<string, "default" | "success" | "warning" | "danger"> = {
  EN_ATTENTE: "warning",
  APPROUVE: "success",
  REJETE: "danger",
};

const WEEK_DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function WeeklyCalendar({ bookings }: { bookings: Booking[] }) {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = WEEK_DAYS.map((label, i) => ({ label, date: addDays(weekStart, i) }));

  const getBookingsForDay = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter((b) => b.startTime.startsWith(dateStr) && b.status === "APPROUVE");
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[400px]">
        {days.map(({ label, date }) => {
          const dayBookings = getBookingsForDay(date);
          const isToday = format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");
          return (
            <div key={label} className="flex flex-col gap-1">
              <div className={`text-center text-xs font-semibold py-1 rounded-t-lg ${isToday ? "bg-teal-deep text-white" : "text-muted"}`}>
                {label}
                <br />
                <span className="font-normal">{format(date, "dd")}</span>
              </div>
              <div className="min-h-[80px] rounded-b-lg bg-teal-muted/30 border border-card-border p-1 space-y-1">
                {dayBookings.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-md bg-teal-deep text-white text-[10px] px-1.5 py-1 leading-tight truncate"
                    title={`${b.title} — ${format(parseISO(b.startTime), "HH:mm")} à ${format(parseISO(b.endTime), "HH:mm")}`}
                  >
                    <span className="block font-medium truncate">{b.title}</span>
                    <span className="opacity-80">{format(parseISO(b.startTime), "HH:mm")}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SallesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: sallesData, loading, error, refetch } = useApi<{ data: Salle[] }>("/salles");
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useApi<{ data: Booking[] }>("/salles/bookings/pending");

  const salles = sallesData?.data ?? [];
  const pendingBookings = pendingData?.data ?? [];

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN" || user?.role === "PASTEUR";
  const [selectedSalle, setSelectedSalle] = useState<Salle | null>(null);
  const [salleBookings, setSalleBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  // Réservation modal
  const [reserveOpen, setReserveOpen] = useState(false);
  const [reserveSalleId, setReserveSalleId] = useState("");
  const [reserveForm, setReserveForm] = useState({ title: "", startTime: "", endTime: "" });
  const [reserveSubmitting, setReserveSubmitting] = useState(false);
  const [reserveError, setReserveError] = useState("");

  // Nouvelle salle modal
  const [newSalleOpen, setNewSalleOpen] = useState(false);
  const [newSalleForm, setNewSalleForm] = useState({ name: "", capacity: "", features: "" });
  const [newSalleSubmitting, setNewSalleSubmitting] = useState(false);
  const [newSalleError, setNewSalleError] = useState("");

  const handleSelectSalle = async (salle: Salle) => {
    if (selectedSalle?.id === salle.id) {
      setSelectedSalle(null);
      return;
    }
    setSelectedSalle(salle);
    setBookingsLoading(true);
    try {
      const result = await apiFetch(`/salles/${salle.id}/disponibilites`);
      setSalleBookings(result?.data ?? result ?? []);
    } catch {
      setSalleBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const openReserve = (salleId: string) => {
    setReserveSalleId(salleId);
    setReserveForm({ title: "", startTime: "", endTime: "" });
    setReserveError("");
    setReserveOpen(true);
  };

  const handleReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserveSubmitting(true);
    setReserveError("");
    try {
      await apiFetch(`/salles/${reserveSalleId}/reserver`, {
        method: "POST",
        body: JSON.stringify(reserveForm),
      });
      setReserveOpen(false);
      refetch();
      if (selectedSalle?.id === reserveSalleId) {
        const result = await apiFetch(`/salles/${reserveSalleId}/disponibilites`);
        setSalleBookings(result?.data ?? result ?? []);
      }
    } catch (err: any) {
      setReserveError(err.message || "Erreur");
    } finally {
      setReserveSubmitting(false);
    }
  };

  const handleBookingAction = async (bookingId: string, action: "APPROUVE" | "REJETE") => {
    try {
      await apiFetch(`/salles/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: action }),
      });
      refetchPending();
      if (selectedSalle) {
        const result = await apiFetch(`/salles/${selectedSalle.id}/disponibilites`);
        setSalleBookings(result?.data ?? result ?? []);
      }
    } catch (err: any) {
      alert(err.message || "Erreur");
    }
  };

  const handleNewSalle = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSalleSubmitting(true);
    setNewSalleError("");
    try {
      await apiFetch("/salles", {
        method: "POST",
        body: JSON.stringify({ ...newSalleForm, capacity: parseInt(newSalleForm.capacity) }),
      });
      setNewSalleOpen(false);
      setNewSalleForm({ name: "", capacity: "", features: "" });
      refetch();
    } catch (err: any) {
      setNewSalleError(err.message || "Erreur");
    } finally {
      setNewSalleSubmitting(false);
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
        title="Gestion des Salles"
        subtitle="Calendrier de disponibilité et réservations"
        action={
          isAdmin ? (
            <button
              onClick={() => setNewSalleOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors"
            >
              <Plus size={16} />
              Ajouter une salle
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Pending bookings (admin) */}
      {isAdmin && !pendingLoading && pendingBookings.length > 0 && (
        <div className="mb-6 rounded-2xl bg-gold-muted border border-gold/40 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-gold" />
            <span className="font-semibold text-gold text-sm">
              {pendingBookings.length} réservation{pendingBookings.length > 1 ? "s" : ""} en attente d'approbation
            </span>
          </div>
          <div className="space-y-2">
            {pendingBookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 bg-card-bg rounded-xl px-4 py-2.5 border border-gold/20">
                <div>
                  <p className="text-sm font-medium text-foreground">{b.title}</p>
                  <p className="text-xs text-muted">
                    {b.startTime ? format(parseISO(b.startTime), "dd/MM/yyyy HH:mm") : "—"} → {b.endTime ? format(parseISO(b.endTime), "HH:mm") : "—"}
                    {b.reservedBy && ` • ${b.reservedBy}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleBookingAction(b.id, "APPROUVE")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-deep text-white text-xs font-medium hover:bg-teal-light transition-colors"
                  >
                    <CheckCircle size={12} />
                    Approuver
                  </button>
                  <button
                    onClick={() => handleBookingAction(b.id, "REJETE")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    <XCircle size={12} />
                    Rejeter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salles grid */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : salles.length === 0 ? (
        <EmptyState icon={<DoorOpen size={40} />} title="Aucune salle" description="Ajoutez une salle pour commencer." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {salles.map((salle) => (
              <div
                key={salle.id}
                className={`rounded-2xl bg-card-bg border transition-all cursor-pointer ${
                  selectedSalle?.id === salle.id ? "border-teal-deep shadow-md" : "border-card-border hover:border-teal-deep/50"
                }`}
                onClick={() => handleSelectSalle(salle)}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{salle.name}</h3>
                    <Badge label={`${salle.capacity} places`} variant="info" />
                  </div>
                  {salle.features && (
                    <p className="text-xs text-muted mb-3">{salle.features}</p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); openReserve(salle.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-deep text-white text-xs font-medium hover:bg-teal-light transition-colors"
                  >
                    <Plus size={12} />
                    Réserver
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Calendar view for selected salle */}
          {selectedSalle && (
            <div className="rounded-2xl bg-card-bg border border-card-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">
                  Disponibilités — {selectedSalle.name}
                </h3>
                <span className="text-xs text-muted">Cette semaine</span>
              </div>
              {bookingsLoading ? (
                <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
              ) : (
                <WeeklyCalendar bookings={salleBookings} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal : Réserver */}
      <Modal open={reserveOpen} onClose={() => setReserveOpen(false)} title="Réserver la salle" size="sm">
        <form onSubmit={handleReserve} className="space-y-4">
          {reserveError && <p className="text-sm text-red-500">{reserveError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Titre de la réservation <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={reserveForm.title}
              onChange={(e) => setReserveForm((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Début <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              required
              value={reserveForm.startTime}
              onChange={(e) => setReserveForm((p) => ({ ...p, startTime: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Fin <span className="text-red-500">*</span></label>
            <input
              type="datetime-local"
              required
              value={reserveForm.endTime}
              onChange={(e) => setReserveForm((p) => ({ ...p, endTime: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setReserveOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={reserveSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {reserveSubmitting ? "Réservation…" : "Réserver"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal : Nouvelle salle */}
      <Modal open={newSalleOpen} onClose={() => setNewSalleOpen(false)} title="Ajouter une salle" size="sm">
        <form onSubmit={handleNewSalle} className="space-y-4">
          {newSalleError && <p className="text-sm text-red-500">{newSalleError}</p>}
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nom de la salle <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={newSalleForm.name}
              onChange={(e) => setNewSalleForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Capacité <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              min={1}
              value={newSalleForm.capacity}
              onChange={(e) => setNewSalleForm((p) => ({ ...p, capacity: e.target.value }))}
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Équipements / Caractéristiques</label>
            <input
              type="text"
              value={newSalleForm.features}
              onChange={(e) => setNewSalleForm((p) => ({ ...p, features: e.target.value }))}
              placeholder="Projecteur, Sonorisation, Climatisation…"
              className="w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-teal-deep/40"
            />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => setNewSalleOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-foreground bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button type="submit" disabled={newSalleSubmitting} className="px-4 py-2 rounded-lg bg-teal-deep text-white text-sm font-medium hover:bg-teal-light transition-colors disabled:opacity-50">
              {newSalleSubmitting ? "Ajout…" : "Ajouter"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
