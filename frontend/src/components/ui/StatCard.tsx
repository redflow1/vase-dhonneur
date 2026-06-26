import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "flat";
  subtitle?: string;
}

const trendConfig = {
  up: { icon: <TrendingUp size={16} />, color: "text-green-500" },
  down: { icon: <TrendingDown size={16} />, color: "text-red-500" },
  flat: { icon: <Minus size={16} />, color: "text-muted" },
};

export default function StatCard({
  title,
  value,
  icon,
  trend,
  subtitle,
}: StatCardProps) {
  const trendInfo = trend ? trendConfig[trend] : null;

  return (
    <div className="rounded-2xl bg-card-bg border border-card-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{title}</span>
        <span className="text-teal-deep">{icon}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        {trendInfo && (
          <span className={`flex items-center gap-1 text-sm font-medium mb-1 ${trendInfo.color}`}>
            {trendInfo.icon}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs text-muted">{subtitle}</p>
      )}
    </div>
  );
}
