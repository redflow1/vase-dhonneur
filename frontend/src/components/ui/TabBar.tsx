"use client";

interface TabBarProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div className="flex overflow-x-auto border-b border-card-border gap-1 no-scrollbar">
      {tabs.map((tab) => {
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-shrink-0 px-4 py-2.5 text-sm transition-colors whitespace-nowrap ${
              isActive
                ? "border-b-2 border-teal-deep text-teal-deep font-semibold"
                : "text-muted hover:text-foreground hover:bg-teal-muted rounded-t-lg"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
