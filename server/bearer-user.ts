import type { RequestHandler } from "express";
import type { User } from "@shared/schema";

const resolvedHeader = Symbol("resolvedBearerHeader");
type BearerRequest = Parameters<RequestHandler>[0] & { [resolvedHeader]?: string };

export function createBearerUserResolver(deps: {
  verifyToken(token: string): Promise<{ sub: string }>;
  getUserByUsername(username: string): Promise<User | undefined>;
}): RequestHandler {
  return async (request, _response, next) => {
    const req = request as BearerRequest;
    const header = req.get("authorization");
    if (!header?.startsWith("Bearer ") || req[resolvedHeader] === header) return next();
    req[resolvedHeader] = header;
    // An explicit native identity must not inherit a previous user's cookie.
    delete req.user;
    try {
      const verified = await deps.verifyToken(header.slice(7));
      if (verified.sub) req.user = await deps.getUserByUsername(`clerk_${verified.sub}`);
    } catch {
      // Protected routes retain their own 401/403 response; never log tokens.
    }
    next();
  };
}
