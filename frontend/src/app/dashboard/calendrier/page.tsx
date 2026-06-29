"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/ui/PageHeader";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

interface Evenement {
  id: string;
  title: string;
  type: string;
  startDate: string;
  endDate?: string;
  location?: string;
}

const TYPE_COLORS: Record<string, string> = {
  CULTE: "bg-blue-500",
  CROISADE: "bg-orange-500",
  CONFERENCE: "bg-purple-500",
  CAMP: "bg-green-500",
  REUNION: "bg-teal-500",
  AUTRE: "bg-gray-500",
};

export default function CalendrierPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: eventsData, loading } = useApi<{ data: Evenement[] }>("/evenements");
  const events = eventsData?.data ?? [];

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Evenement[]>();
    events.forEach((ev) => {
      const day = format(parseISO(ev.startDate), "yyyy-MM-dd");
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(ev);
    });
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? eventsByDay.get(format(selectedDate, "yyyy-MM-dd")) ?? [] : [];

  if (authLoading || loading) {
    return <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div>
      <PageHeader title="Calendrier" subtitle="Vue mensuelle des événements" />

      <div className="bg-card-bg border border-card-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-teal-muted transition-colors">
            <ChevronLeft className="w-5 h-5 text-muted" />
          </button>
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: fr })}
          </h2>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-teal-muted transition-colors">
            <ChevronRight className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-card-border">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
            <div key={d} className="px-2 py-2 text-xs font-semibold text-muted text-center uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = isSameDay(day, new Date());
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className={`min-h-[80px] p-2 border-b border-r border-card-border text-left transition-colors hover:bg-teal-muted/50 ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isSelected ? "bg-teal-muted ring-2 ring-teal-deep ring-inset" : ""}`}
              >
                <span className={`text-sm font-medium ${isToday ? "bg-teal-deep text-white w-7 h-7 rounded-full flex items-center justify-center" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[10px] leading-tight px-1 py-0.5 rounded text-white truncate ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[10px] text-muted">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="mt-6 bg-card-bg border border-card-border rounded-2xl p-4">
          <h3 className="font-semibold text-foreground mb-3">
            Événements du {format(selectedDate, "dd MMMM yyyy", { locale: fr })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted">Aucun événement ce jour.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-center gap-3 p-3 rounded-xl bg-teal-muted/30">
                  <div className={`w-2 h-2 rounded-full ${TYPE_COLORS[ev.type] ?? "bg-gray-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{ev.title}</p>
                    <p className="text-xs text-muted">
                      {ev.type} {ev.location ? `— ${ev.location}` : ""}
                    </p>
                  </div>
                  <Badge label={ev.type} variant="default" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
