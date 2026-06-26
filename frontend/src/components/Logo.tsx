import Image from "next/image";

export function Logo({ size = "md", showText = true }: { size?: "sm" | "md" | "lg"; showText?: boolean }) {
  const dims = { sm: 40, md: 56, lg: 80 };
  const d = dims[size];
  const textSize = { sm: "text-xs", md: "text-sm", lg: "text-base" };

  return (
    <div className="flex items-center gap-3">
      <Image
        src="/logo.webp"
        alt="Vases d'Honneur"
        width={d}
        height={d}
        className="rounded-full object-cover"
        style={{ width: "auto", height: "auto" }}
        priority
      />
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${textSize[size]} tracking-wider text-gold`}>
            VASES
          </span>
          <span className={`font-bold ${textSize[size]} tracking-wider text-teal-deep dark:text-teal-muted`}>
            D&apos;HONNEUR
          </span>
        </div>
      )}
    </div>
  );
}
