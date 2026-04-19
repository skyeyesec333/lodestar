"use client";

import { Toaster } from "sonner";

export function ToasterMount() {
  return (
    <Toaster
      position="bottom-right"
      offset={16}
      gap={8}
      closeButton
      toastOptions={{
        style: {
          background: "var(--bg-card)",
          color: "var(--text)",
          border: "1px solid var(--border)",
          fontFamily: "inherit",
        },
        classNames: {
          success: "ls-toast-success",
          error: "ls-toast-error",
          info: "ls-toast-info",
        },
      }}
    />
  );
}
