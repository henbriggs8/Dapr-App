import { ServerResponse, type IncomingMessage, type Server } from "node:http";
import type { Request, RequestHandler, Response } from "express";
import type { SessionData } from "express-session";
import { WebSocket, WebSocketServer } from "ws";

type SocketUser = { id: number; isProvider: boolean };
type StoredSession = SessionData & { passport?: { user?: unknown } };
type Dependencies = {
  sessionMiddleware: RequestHandler;
  readSession(id: string): Promise<StoredSession | null | undefined>;
  getUser(id: number): Promise<SocketUser | undefined>;
  getUserByUsername(username: string): Promise<SocketUser | undefined>;
  verifyToken(token: string): Promise<{ sub: string; exp: number }>;
  authTimeoutMs?: number;
};
type Connection = { socket: WebSocket; userId: number; validate(): Promise<SocketUser | undefined> };

function permittedOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (process.env.APP_ENV === "staging" && origin) return origin === process.env.SITE_URL;
  if (process.env.SITE_URL && origin === process.env.SITE_URL) return true;
  if (!origin) return true; // Headerless native clients must use a Clerk token.
  if (["https://autodapper.com", "https://www.autodapper.com", "https://dapper-pros.replit.app",
    "capacitor://localhost", "ionic://localhost"].includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    try {
      const url = new URL(origin);
      const local = ["localhost", "127.0.0.1"].includes(url.hostname) && url.protocol === "http:";
      const replitPreview = url.hostname.endsWith(".replit.dev") && url.protocol === "https:";
      return (local || replitPreview) && url.host === request.headers.host;
    } catch { /* Reject malformed origins. */ }
  }
  return false;
}

export function attachAuthenticatedWebSocketServer(server: Server, deps: Dependencies) {
  const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 8192 });
  const connections = new Set<Connection>();

  wss.on("connection", (socket, request) => {
    socket.on("error", () => socket.close());
    if (!permittedOrigin(request)) return socket.close(1008, "Origin not allowed");
    let authenticating = false;
    let connection: Connection | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const timeout = setTimeout(() => socket.close(1008, "Authentication required"), deps.authTimeoutMs ?? 5000);
    timeout.unref();
    socket.on("close", () => {
      clearTimeout(timeout);
      if (expiry) clearTimeout(expiry);
      if (connection) connections.delete(connection);
    });
    socket.on("message", async raw => {
      try {
        const message = JSON.parse(raw.toString());
        // A socket cannot change identities or race two authentication attempts.
        if (connection || authenticating || message?.type !== "auth") {
          socket.close(1008, "Invalid authentication message");
          return;
        }
        authenticating = true;
        let validate: Connection["validate"];
        let expiresAt: number | undefined;
        if (message.token !== undefined) {
          if (typeof message.token !== "string" || !message.token) throw new Error("Invalid token");
          const token = message.token;
          const claims = await deps.verifyToken(token);
          if (!claims.sub || !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now()) throw new Error("Expired token");
          expiresAt = claims.exp * 1000;
          validate = async () => {
            const current = await deps.verifyToken(token);
            if (current.sub !== claims.sub || current.exp * 1000 <= Date.now()) return undefined;
            return deps.getUserByUsername(`clerk_${current.sub}`);
          };
        } else {
          // Parse the same signed cookie and store used by Express/Passport.
          // No Origin means no cookie fallback (prevents ambient-cookie abuse).
          if (!request.headers.origin) throw new Error("Token required");
          const req = request as Request;
          await new Promise<void>((resolve, reject) => {
            deps.sessionMiddleware(req, new ServerResponse(request) as unknown as Response,
              error => error ? reject(error) : resolve());
          });
          const sessionId = req.sessionID;
          validate = async () => {
            const session = await deps.readSession(sessionId);
            const id = session?.passport?.user;
            if (!Number.isSafeInteger(id) || Number(id) <= 0) return undefined;
            if (session?.cookie?.expires && new Date(session.cookie.expires).getTime() <= Date.now()) return undefined;
            return deps.getUser(Number(id));
          };
        }
        const user = await validate();
        if (!user || (message.userId !== undefined && message.userId !== user.id)) throw new Error("Identity mismatch");
        if (socket.readyState !== WebSocket.OPEN) return;
        connection = { socket, userId: user.id, validate };
        connections.add(connection);
        clearTimeout(timeout);
        if (expiresAt) {
          expiry = setTimeout(() => socket.close(1008, "Authentication expired"), Math.min(expiresAt - Date.now(), 2_147_483_647));
          expiry.unref();
        }
        socket.send(JSON.stringify({ type: "auth_confirmed", userId: user.id }));
      } catch {
        socket.close(1008, "Authentication failed");
      }
    });
  });

  async function deliver(connection: Connection, payload: unknown, providerOnly = false) {
    try {
      // Re-read cookie sessions on every event so logout, expiry and deletion
      // revoke delivery. Clerk tokens are reverified and bounded by expiry.
      const user = await connection.validate();
      if (!user || user.id !== connection.userId) {
        connection.socket.close(1008, "Authentication expired");
        return;
      }
      if (providerOnly && !user.isProvider) return;
      if (connection.socket.readyState === WebSocket.OPEN) connection.socket.send(JSON.stringify(payload));
    } catch {
      connection.socket.close(1008, "Authentication failed");
    }
  }

  return {
    async sendToUsers(userIds: number[], payload: unknown) {
      const recipients = new Set(userIds);
      await Promise.all(Array.from(connections).filter(c => recipients.has(c.userId)).map(c => deliver(c, payload)));
    },
    async notifyMarketplace(event: "new_job_available" | "available_jobs_changed", providerIds?: number[]) {
      const recipients = providerIds ? new Set(providerIds) : undefined;
      // Offers are fetched through the authorized HTTP endpoint. Never broadcast
      // a raw booking, customer identity, street address or provider location.
      await Promise.all(Array.from(connections).filter(c => !recipients || recipients.has(c.userId))
        .map(c => deliver(c, { type: event }, true)));
    },
    close() {
      wss.clients.forEach(socket => socket.terminate());
      wss.close();
    },
  };
}
