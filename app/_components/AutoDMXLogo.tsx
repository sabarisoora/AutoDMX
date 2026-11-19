import React from "react";
import Image from "next/image";

export type AutoDMXIconProps = {
  className?: string;
};

export type AutoDMXLogoProps = {
  /**
   * 'icon': mark only
   * 'wordmark': text only ("AutoDMX")
   * 'horizontal': mark + text side-by-side
   * 'full': stacked mark + text + tagline
   */
  variant?: "icon" | "wordmark" | "horizontal" | "full";
  className?: string;
  showTagline?: boolean;
};

/**
 * Minimalist Apple-inspired geometric vector icon for AutoDMX.
 * Clean, high-precision geometry that looks pristine in dark and light modes.
 */
export function AutoDMXIcon({ className = "w-7 h-7" }: AutoDMXIconProps) {
  return (
    <span className={`relative inline-block overflow-hidden rounded-full bg-[#00d0f5] ${className}`} aria-hidden="true">
      <Image src="/sabari.webp" alt="" fill sizes="56px" className="object-cover object-top" />
    </span>
  );
}

function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif tracking-tight text-neutral-900 dark:text-white ${className}`}>
      Billionaire <span className="italic">Sabari</span>
      <span className="text-[#00b8d9]">.</span>
    </span>
  );
}

/** Brand logo (kept the original export names so existing imports keep working). */
export function AutoDMXLogo({
  variant = "horizontal",
  className = "",
}: AutoDMXLogoProps) {
  if (variant === "icon") return <AutoDMXIcon className={className || "w-7 h-7"} />;
  if (variant === "wordmark") return <Wordmark className={`text-[1.15rem] ${className}`} />;
  if (variant === "full") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <AutoDMXIcon className="h-14 w-14" />
        <Wordmark className="mt-3.5 text-2xl" />
      </div>
    );
  }
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <AutoDMXIcon className="h-7 w-7 shrink-0" />
      <Wordmark className="text-[1.1rem]" />
    </div>
  );
}
