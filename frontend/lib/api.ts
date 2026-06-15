const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface ApiMessage {
  id: string;
  conversationId: string;
  sender: "user" | "ai";
  text: string;
  createdAt: string | number;
}

export interface SendMessageResponse {
  reply: string;
  sessionId: string;
}

export interface HistoryResponse {
  sessionId: string;
  messages: ApiMessage[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "An unexpected error occurred.";
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse failure
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

export async function sendMessage(
  message: string,
  sessionId?: string
): Promise<SendMessageResponse> {
  const res = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, sessionId }),
    signal: AbortSignal.timeout(30_000),
  });
  return handleResponse<SendMessageResponse>(res);
}

export async function fetchHistory(sessionId: string): Promise<HistoryResponse> {
  const res = await fetch(`${API_BASE}/chat/history/${sessionId}`, {
    signal: AbortSignal.timeout(10_000),
  });
  return handleResponse<HistoryResponse>(res);
}
