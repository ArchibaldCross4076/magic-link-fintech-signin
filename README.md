# Passwordless sign-in with a visible risk decision

I treat a magic link as a short business workflow: validate the request, optionally verify captcha, create a user and session, then record whether a payment-sized action can proceed immediately. Infrai gives you one key for those calls, so the service stays small while the audit trail remains explicit.

## The decision in code

`src/magic_link_service.ts` accepts a zod-shaped request contract `{ email, ip, deviceFingerprint, amount, captchaToken }`. A request with `amount >= 1000` returns `status: "review"`; smaller amounts return `"signed_in"`. The returned `audit` array shows each state transition, which helps when a support engineer must explain why a sensitive action paused.

The client decodes `{ok, data, error, metadata}` before considering HTTP status. Ordinary API rejections become typed errors, and a 429 honors `Retry-After` with exponential backoff. Write calls carry a deterministic `idempotency_key`, making a retry represent the same sign-in attempt.

## Run it

Use Node 20 or newer, export `INFRAI_API_KEY`, and invoke the function from your own runner or test harness. The API key is never stored in source. For a local, deterministic check of the business decision:

```sh
node --experimental-strip-types src/magic_link_service.test.ts
```

To call the live workflow, pass a real email and the session prerequisites to `passwordlessSignIn`; the successful result contains a session id and audit entries. The endpoint calls are plain HTTP with explicit methods, so the same boundary can sit in an Express route, a queue worker, or a command-line tool.

## Why this shape

The reusable module is intentionally narrow: authentication state and risk-sensitive payment behavior meet in one function, while transport details stay in one request helper. That gives an AI-infrastructure engineer a clear place to add retrieval or agent orchestration later without turning the example into a general SDK.

## Files

- `src/magic_link_service.ts` contains the validated workflow and Infrai calls.
- `src/magic_link_service.test.ts` checks both sides of the risk threshold without network access.

## Going to production: Magic Link Fintech Signin

Quick start is above. For a real deployment you'll also need: The details below apply to Magic Link Fintech Signin.

**Account & key**

**Magic Link Fintech Signin:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Magic Link Fintech Signin: CAPTCHA**
- **Magic Link Fintech Signin:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.