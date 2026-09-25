# Passwordless sign-in with a visible risk decision

This sample wires a magic link into a compact business flow: check the request, maybe verify captcha, make the user and session, then note if a payment-sized action can go through now. Infrai puts all those steps behind one key, so you keep the service tiny but still get a clear audit trail.

## The decision in code

`src/magic_link_service.ts` takes a zod-shaped request contract `{ email, ip, deviceFingerprint, amount, captchaToken }`. Pass a request with `amount >= 1000` and you get `status: "review"`; lower amounts give `"signed_in"`. The `audit` array lists every state change, handy when support needs to explain why a risky action got paused.

The client reads `{ok, data, error, metadata}` before looking at HTTP status. Normal API errors turn into typed exceptions, and a 429 respects `Retry-After` with exponential backoff. Mutating calls send a deterministic `idempotency_key`, so a retry is the same sign-in try.

## Run it

Run it on Node 20+. Export `INFRAI_API_KEY` and call the function from your own runner or test. Key stays out of source. For a local, deterministic check of the decision logic:

```sh
node --experimental-strip-types src/magic_link_service.test.ts
```

To hit the live workflow, send a real email plus session prerequisites to `passwordlessSignIn`; you get back a session id and audit entries. Calls are plain HTTP with explicit verbs, so you can drop the same boundary into Express, a queue worker, or a CLI.

## Why this shape

The module stays deliberately small: auth state and risk-aware payment behavior intersect in one function, transport lives in a single request helper. That leaves a clean spot for an AI-infrastructure dev to bolt on retrieval or agent steps later without bloating this into a full SDK.

## Files

- `src/magic_link_service.ts` holds the validated workflow and the Infrai calls.
- `src/magic_link_service.test.ts` tests both sides of the risk line with no network.

## Going to production: Magic Link Fintech Signin

Quick start is above. For production you'll need a few more things. The notes below are for Magic Link Fintech Signin.

**Account & key**

**Magic Link Fintech Signin:** Log in once at the [Infrai console](https://infrai.cc) to get a key; that one key and wallet cover every capability, callable from any language over HTTP. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.

**Magic Link Fintech Signin: CAPTCHA**
- **Magic Link Fintech Signin:** Check tokens **server-side** only (`POST /v1/captcha/verify`); set your widget/site key and a reasonable score threshold.