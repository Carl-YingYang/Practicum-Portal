import Image from "next/image";
import { cn } from "@/lib/utils";

/** Product identity; configurable school branding stays in the school sidebar. */
export function PractoBrand({ className, small = false }: { className?: string; small?: boolean }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-2", className)}>
      <Image src="/logo.svg" alt="" aria-hidden="true" width={small ? 24 : 32} height={small ? 24 : 32} className="shrink-0 rounded-md" />
      <span>PRACTO<span className="text-[var(--brand-accent)]">.</span></span>
    </span>
  );
}
