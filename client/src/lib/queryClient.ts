import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";

// ─── Native API routing ────────────────────────────────────────────────────
// When running in a Capacitor native app the frontend bundle is served from
// capacitor://localhost which has no Express backend.  All /api/* calls must
// go to the deployed production server instead.
const IS_NATIVE = Capacitor.isNativePlatform();

// Set VITE_API_BASE_URL in your .env.local before running `npm run build`
// for an iOS release build (e.g. https://yourapp.replit.app).
// Falls back to autodapper.com which should be your production domain.
const API_BASE = IS_NATIVE
  ? (import.meta.env.VITE_API_BASE_URL || "https://autodapper.com")
  : "";

// ─── Clerk token store ─────────────────────────────────────────────────────
// React components call setClerkTokenGetter() on mount so every request
// can include the current Clerk bearer token on native builds.
let _getToken: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (!IS_NATIVE || !_getToken) return {};
  try {
    const token = await _getToken();
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

function resolveUrl(url: string): string {
  if (!IS_NATIVE) return url;
  // Prepend API_BASE for absolute paths; leave full URLs alone
  return url.startsWith("/") ? `${API_BASE}${url}` : url;
}

// ─── Core helpers ──────────────────────────────────────────────────────────

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<Response> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(resolveUrl(url), {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      ...authHeaders,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(resolveUrl(queryKey[0] as string), {
      credentials: "include",
      headers: authHeaders,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
