import Image from "next/image";
import logo from "../../public/brand/ce-logo-black-red.png";

type BrandSize = "sm" | "md" | "lg";

const SIZE_HEIGHT: Record<BrandSize, number> = {
  sm: 20,
  md: 28,
  lg: 44,
};

/**
 * Conscious Engines brand lockup.
 * Uses the full black+red logotype artwork. The "block" around the "O"
 * inverts correctly on dark backgrounds because the PNG has transparency
 * and the foreground ink auto-reads as currentColor when we wrap it.
 */
export function Brand({
  size = "md",
  sublabel,
  className = "",
}: {
  size?: BrandSize;
  sublabel?: string;
  className?: string;
}) {
  const height = SIZE_HEIGHT[size];
  const aspect = 854 / 230;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src={logo}
        alt="Conscious Engines"
        height={height}
        width={Math.round(height * aspect)}
        priority={size === "lg"}
        className="ce-logo"
      />
      {sublabel && (
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)] sm:inline">
          <span aria-hidden="true" className="mr-2 opacity-60">
            /
          </span>
          {sublabel}
        </span>
      )}
    </div>
  );
}
