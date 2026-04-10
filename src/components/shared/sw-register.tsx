"use client";

import { useEffect } from "react";

export function SWRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Check for updates every 60 seconds
          setInterval(() => reg.update(), 60000);
        })
        .catch(() => {
          // SW registration failed silently
        });
    }
  }, []);

  return null;
}
