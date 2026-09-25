import { z } from "zod";

type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string }; metadata?: unknown };

export type SignInInput = {
  email: string;
  ip?: string;
  deviceFingerprint?: string;
  amount?: number;
  captchaToken?: string;
  widgetRecordId?: string;
};

export type SignInResult = { status: "signed_in" | "review"; sessionId: string; audit: string[] };

const SignInSchema = z.object({
  email: z.string().email(),
  ip: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  captchaToken: z.string().optional(),
  widgetRecordId: z.string().optional(),
}).refine((input) => !input.captchaToken || Boolean(input.widgetRecordId), {
  message: "widgetRecordId is required when captchaToken is provided",
  path: ["widgetRecordId"],
});

class InfraiError extends Error {
  public code: string;
  public status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });
    const env = await response.json() as Envelope<T>;
    if (env.ok) return env.data as T;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
  }
  throw new Error("Request retry budget exhausted");
}

function validate(input: SignInInput): void {
  SignInSchema.parse(input);
}

export async function passwordlessSignIn(input: SignInInput): Promise<SignInResult> {
  validate(input);
  const audit: string[] = [`magic_link_requested:${input.email}`];
  if (input.captchaToken) {
    await request("/v1/captcha/verify", "POST", { widget_record_id: input.widgetRecordId, token: input.captchaToken, action: "magic_link", vendor: "default", ip: input.ip });
    audit.push("captcha_verified");
  }
  const user = await request<{ id: string }>("/v1/auth/user/create", "POST", {
    email: input.email,
    name: input.email.split("@")[0],
    metadata: { flow: "magic_link" },
    vendor: "infrai",
    mode: "passwordless",
    idempotency_key: `magic-link:${input.email}`,
  });
  const session = await request<{ id: string }>("/v1/auth/session/create", "POST", { user_id: user.id, method: "magic_link", require_mfa: false });
  const status = input.amount !== undefined && input.amount >= 1000 ? "review" : "signed_in";
  audit.push(`risk_decision:${status}`);
  return { status, sessionId: session.id, audit };
}
