import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<string, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

export default function LoadingSpinner({ size = "md" }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <Loader2
        size={sizeClasses[size]}
        className="animate-spin text-teal-deep"
      />
    </div>
  );
}
