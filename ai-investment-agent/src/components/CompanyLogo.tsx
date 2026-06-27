"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/** Deterministic accent colour for a monogram fallback. */
export function monogramHue(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

/** Extract a bare domain ("apple.com") from a company website URL. */
export function domainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface CompanyLogoProps {
  /** Company website, or a bare domain — used to fetch the real brand logo. */
  website?: string | null;
  /** Seed for the monogram/colour fallback when no logo is available — usually the ticker or name. */
  seed: string;
  size?: number;
  className?: string;
}

/**
 * Ordered list of public logo sources to try for a given domain. We walk down
 * this chain on each image error and only show the monogram once every source
 * has failed. (Clearbit's free logo API was sunset and now refuses
 * connections, so it's intentionally absent.)
 */
function logoSources(domain: string): string[] {
  return [
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  ];
}

/**
 * Renders a company's real logo (keyed off its website domain) and falls back
 * to a deterministic monogram if the domain is unknown or every logo source
 * fails to load.
 */
export default function CompanyLogo({ website, seed, size = 40, className }: CompanyLogoProps) {
  const domain = domainFromUrl(website);
  // Index into logoSources(); once it runs off the end we render the monogram.
  const [srcIndex, setSrcIndex] = useState(0);
  const hue = monogramHue(seed);
  const mono = seed.slice(0, 2).toUpperCase();

  const sources = domain ? logoSources(domain) : [];
  const src = sources[srcIndex];

  if (!src) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-lg text-sm font-bold tracking-tight", className)}
        style={{
          width: size,
          height: size,
          background: `hsl(${hue} 55% 16%)`,
          color: `hsl(${hue} 80% 72%)`,
          border: `1px solid hsl(${hue} 50% 24%)`,
        }}
      >
        {mono}
      </div>
    );
  }

  return (
    <div
      className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white", className)}
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={src}
        src={src}
        alt=""
        width={size}
        height={size}
        className="h-full w-full object-contain p-1"
        onError={() => setSrcIndex((i) => i + 1)}
      />
    </div>
  );
}
