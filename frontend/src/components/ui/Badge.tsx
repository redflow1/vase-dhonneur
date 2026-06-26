interface BadgeProps {
  label: string;
  variant?: "default" | "success" | "warning" | "danger" | "info";
}

const variantClasses: Record<string, string> = {
  default: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
  success: "bg-teal-muted text-teal-deep",
  warning: "bg-gold-muted text-gold",
  danger: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}
