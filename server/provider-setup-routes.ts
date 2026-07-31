import type { Express, NextFunction, Request, Response } from "express";
import { resolveUserFromBearer } from "./clerk-middleware";
import {
  ProviderSetupError,
  REQUIRED_SERVICE_GUIDE_VERSION,
  activationBlockers,
  hasApprovedVehicleVerification,
  validateServiceArea,
  validateServiceGuideAcknowledgement,
  validateTrainingNotes,
} from "./provider-setup-policy";
import {
  ProviderSetupRepository,
  type ProviderSetupState,
} from "./provider-setup-repository";

type AdminMiddleware = (req: Request, res: Response, next: NextFunction) => unknown;
type SetupRepository = Pick<
  ProviderSetupRepository,
  "getState" | "acknowledgeServiceGuide" | "confirmServiceArea" | "completeTraining"
>;

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderSetupError(400, "INVALID_ID", "Application ID must be a positive integer.");
  }
  return id;
}

function setupResponse(state: ProviderSetupState, admin = false) {
  const { application, setup, media, trainingAdmin } = state;
  const serviceGuideComplete = Boolean(
    setup?.serviceGuideAcknowledgedAt
    && setup.serviceGuideVersion === REQUIRED_SERVICE_GUIDE_VERSION,
  );
  const serviceAreaComplete = Boolean(
    setup?.serviceAreaConfirmedAt
    && setup.serviceAreaRegion?.trim()
    && setup.serviceAreaZipCodes?.length
    && setup.maxTravelRadius !== null
    && setup.maxTravelRadius >= 5
    && setup.maxTravelRadius <= 50,
  );
  const trainingComplete = Boolean(setup?.trainingCompletedAt && setup.trainingCompletedBy);
  const blockers = activationBlockers(application.applicationStatus, setup, media);

  return {
    applicationId: application.id,
    applicationStatus: application.applicationStatus,
    requiredServiceGuideVersion: REQUIRED_SERVICE_GUIDE_VERSION,
    steps: {
      vehicleVerification: {
        complete: hasApprovedVehicleVerification(media),
      },
      serviceGuide: {
        complete: serviceGuideComplete,
        requiredVersion: REQUIRED_SERVICE_GUIDE_VERSION,
        acknowledgedVersion: setup?.serviceGuideVersion ?? null,
        acknowledgedAt: setup?.serviceGuideAcknowledgedAt ?? null,
      },
      serviceArea: {
        complete: serviceAreaComplete,
        region: setup?.serviceAreaRegion ?? null,
        zipCodes: setup?.serviceAreaZipCodes ?? [],
        maxTravelRadius: setup?.maxTravelRadius ?? null,
        confirmedAt: setup?.serviceAreaConfirmedAt ?? null,
      },
      training: {
        complete: trainingComplete,
        completedAt: setup?.trainingCompletedAt ?? null,
        ...(admin ? {
          completedBy: trainingAdmin,
          notes: setup?.trainingNotes ?? null,
        } : {}),
      },
    },
    activation: {
      ready: blockers.length === 0,
      active: application.applicationStatus === "active_provider",
      blockers,
      activatedAt: setup?.activatedAt ?? null,
    },
  };
}

function routeError(res: Response, error: unknown) {
  if (error instanceof ProviderSetupError) {
    return res.status(error.status).json({
      code: error.code,
      error: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
  }
  console.error("[provider-setup] route error:", error);
  return res.status(500).json({
    code: "INTERNAL_ERROR",
    error: "Provider setup could not be completed.",
  });
}

export function registerProviderSetupRoutes(
  app: Express,
  requireAdmin: AdminMiddleware,
  repository: SetupRepository = new ProviderSetupRepository(),
): void {
  app.get("/api/provider-applications/:id/setup", resolveUserFromBearer, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    }
    try {
      const state = await repository.getState(parseId(req.params.id), req.user.id);
      return res.json(setupResponse(state));
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.post("/api/provider-applications/:id/setup/service-guide/acknowledge", resolveUserFromBearer, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    }
    try {
      const state = await repository.acknowledgeServiceGuide(
        parseId(req.params.id),
        req.user.id,
        validateServiceGuideAcknowledgement(req.body),
      );
      return res.json(setupResponse(state));
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.put("/api/provider-applications/:id/setup/service-area", resolveUserFromBearer, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ code: "UNAUTHENTICATED", error: "Authentication required." });
    }
    try {
      const state = await repository.confirmServiceArea(
        parseId(req.params.id),
        req.user.id,
        validateServiceArea(req.body),
      );
      return res.json(setupResponse(state));
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.get("/api/admin/provider-applications/:id/setup", requireAdmin, async (req, res) => {
    try {
      const state = await repository.getState(parseId(req.params.id));
      return res.json(setupResponse(state, true));
    } catch (error) {
      return routeError(res, error);
    }
  });

  app.post("/api/admin/provider-applications/:id/setup/training/complete", requireAdmin, async (req, res) => {
    try {
      const state = await repository.completeTraining(
        parseId(req.params.id),
        req.user!.id,
        validateTrainingNotes(req.body?.notes),
      );
      return res.json(setupResponse(state, true));
    } catch (error) {
      return routeError(res, error);
    }
  });
}
