interface MemberAvatarProps {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses: Record<string, string> = {
  sm: "w-7 h-7 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-16 h-16 text-lg",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MemberAvatar({
  name,
  photoUrl,
  size = "md",
}: MemberAvatarProps) {
  const baseClass = `rounded-full flex-shrink-0 overflow-hidden ${sizeClasses[size]}`;

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        className={`${baseClass} object-cover`}
      />
    );
  }

  return (
    <div
      className={`${baseClass} flex items-center justify-center bg-teal-deep text-gold font-semibold`}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}
