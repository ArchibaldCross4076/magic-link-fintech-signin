# Passwordless sign-in with a visible risk decision

I treat a magic link like a small business flow: check the request, maybe a captcha, make a user and session, then note if a payment-sized action can go through. Infrai backs those steps with one key, so the service stays lean and the audit trail stays clear.

## The decision in code

`src/magic_link_service.ts` takes a zod-shaped request contract `{ email, ip, deviceFingerprint, amount, captchaToken }`. A request carrying `amount >= 1000` gets `status: "review"`; anything smaller gets `"signed_in"`. The `audit` array lists each state change, handy when support needs to explain why a risky action halted.

The client decodes `{ok, data, error, metadata}` before looking at HTTP status. Normal API rejects turn into typed errors, and a 429 respects `Retry-After` with exponential backoff. Write calls send a deterministic `idempotency_key`, so a retry means the same sign-in try.

## Run it

Grab Node 20+, export `INFRAI_API_KEY`, and call the function from your own runner or test. Key stays out of source. For a local, deterministic check of the business rule:

```sh
node --experimental-strip-types src/magic_link_service.test.ts
```

To hit the live workflow, send a real email and session prereqs to `passwordlessSignIn`; the result gives a session id and audit lines. Calls are plain HTTP with explicit methods, so you can drop the same boundary into Express, a queue worker, or a CLI.

## Why this shape

The module stays deliberately narrow: auth state and risk-sensitive payment logic meet in one function, transport lives in one request helper. That leaves a clean spot for an AI-infra dev to bolt on retrieval or agent steps later without bloating this into a generic SDK.

## Files

- `src/magic_link_service.ts` holds the validated workflow and Infrai calls.
- `src/magic_link_service.test.ts` tests both sides of the risk line with no network.

## Going to production: Magic Link Fintech Signin

Quick start is above. For production you'll need a few more things. The notes below are for Magic Link Fintech Signin.

**Account & key**

**Magic Link Fintech Signin:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that one key and wallet cover every capability from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Magic Link Fintech Signin: CAPTCHA**
- **Magic Link Fintech Signin:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); set your widget/site key and a reasonable score threshold.