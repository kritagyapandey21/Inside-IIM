"use client";

import dynamic from "next/dynamic";

/**
 * Dynamically import the HomeContent component with SSR disabled.
 * This prevents hydration mismatches caused by browser extensions (e.g., Dark Reader)
 * that inject attributes into the DOM before React hydrates.
 */
const HomeContent = dynamic(() => import("@/components/HomeContent"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0b0f",
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: "3px solid #1a1b26",
          borderTopColor: "#6366f1",
          animation: "spin-slow 1s linear infinite",
        }}
      />
    </div>
  ),
});

export default function Home() {
  return <HomeContent />;
}
