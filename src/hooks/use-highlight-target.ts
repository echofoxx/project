"use client";

import { useEffect } from "react";

export function useHighlightTarget(elementId: string | null) {
  useEffect(() => {
    if (!elementId) return;
    const el = document.getElementById(elementId);
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [elementId]);
}
