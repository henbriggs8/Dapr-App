type Options = {
  url: string;
  getToken(): Promise<string | null>;
  onMessage(event: MessageEvent): void;
  onStatus(status: "connecting" | "connected" | "disconnected"): void;
  createSocket?: (url: string) => WebSocket;
  reconnectDelayMs?: number;
};

export function connectAuthenticatedSocket(options: Options) {
  let socket: WebSocket | undefined;
  let stopped = false;
  let authenticated = false;
  let retry: ReturnType<typeof setTimeout> | undefined;
  const connect = () => {
    if (stopped) return;
    authenticated = false;
    options.onStatus("connecting");
    let current: WebSocket;
    try {
      current = (options.createSocket ?? (url => new WebSocket(url)))(options.url);
    } catch {
      options.onStatus("disconnected");
      retry = setTimeout(connect, options.reconnectDelayMs ?? 5000);
      return;
    }
    socket = current;
    current.onopen = async () => {
      try {
        const token = await options.getToken();
        if (!stopped && socket === current && current.readyState === 1) {
          current.send(JSON.stringify(token ? { type: "auth", token } : { type: "auth" }));
        }
      } catch { current.close(); }
    };
    current.onmessage = event => {
      if (stopped || socket !== current) return;
      try {
        if (JSON.parse(event.data).type === "auth_confirmed") {
          authenticated = true;
          options.onStatus("connected");
        }
      } catch { return; }
      if (authenticated) options.onMessage(event);
    };
    current.onerror = () => current.close();
    current.onclose = () => {
      if (stopped || socket !== current) return;
      authenticated = false;
      options.onStatus("disconnected");
      // Reconnect obtains a fresh Clerk token; never reuse an expired credential.
      retry = setTimeout(connect, options.reconnectDelayMs ?? 5000);
    };
  };
  connect();
  return {
    send(message: object) {
      if (authenticated && socket?.readyState === 1) socket.send(JSON.stringify(message));
    },
    close() {
      stopped = true;
      authenticated = false;
      clearTimeout(retry);
      socket?.close();
    },
  };
}
