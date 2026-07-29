"use client";

import { LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";

import { createControlPlaneBrowserClient } from "@/lib/control-plane/client";

export default function CommandCenterLockButton() {
  const controlPlane = useMemo(() => createControlPlaneBrowserClient(), []);
  const [locking, setLocking] = useState(false);

  async function lockCommandCenter() {
    if (locking) return;
    setLocking(true);
    await controlPlane.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.replace("/admin");
  }

  return (
    <button
      type="button"
      className="cc-isolated-lock"
      onClick={lockCommandCenter}
      disabled={locking}
      aria-label="Lock Command Center and return to isolated administrator sign in"
    >
      <LockKeyhole size={17} aria-hidden="true" />
      <span>{locking ? "Locking…" : "Lock Command Center"}</span>
    </button>
  );
}
