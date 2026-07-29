import "server-only";

import { cache } from "react";

import {
  parseControlPlaneAccess,
  type ControlPlaneAccess,
} from "@/lib/control-plane/config";
import { createControlPlaneServerClient } from "@/lib/control-plane/server";

type CommandCenterSession = {
  userId: string;
  email: string;
  access: ControlPlaneAccess;
};

export const getCommandCenterSession = cache(
  async (): Promise<CommandCenterSession | null> => {
    const controlPlane = await createControlPlaneServerClient();
    const userResult = await controlPlane.auth.getUser();
    const user = userResult.data.user;

    if (userResult.error || !user || !user.email) return null;

    const [assurance, accessResult] = await Promise.all([
      controlPlane.auth.mfa.getAuthenticatorAssuranceLevel(),
      controlPlane.rpc("get_my_control_plane_access"),
    ]);
    const access = parseControlPlaneAccess(accessResult.data);

    if (
      assurance.error ||
      assurance.data?.currentLevel !== "aal2" ||
      accessResult.error ||
      !access
    ) {
      return null;
    }

    return {
      userId: user.id,
      email: user.email.trim().toLowerCase(),
      access,
    };
  },
);
