# Rebuilding graindistrict from nothing

Everything the site needs is in this repository except two things, named at the
bottom, that cannot be. Read those first if something has actually gone wrong.

## What is where

| | |
|---|---|
| `index.html` | The entire app. One file, no build step, no dependencies. This *is* the site. |
| `worker/worker.js` | The Cloudflare Worker: the AI proxy, accounts, and project storage. Deployed by hand, so this copy is the only versioned one. |
| `tests/` | 130-odd checks that drive a real browser. `./tests/run.sh`. |

## Putting the site back up

GitHub Pages serves `index.html` from the default branch. Nothing to build.
If Pages is off: repo Settings → Pages → source `main`, folder `/`.

To run it locally, open `index.html` in a browser. It will talk to the live
Worker; everything except signing in works with no Worker at all.

## Putting the Worker back up

`worker/worker.js` is the clean template — the three key constants at the top
are blank on purpose.

1. Cloudflare dashboard → Workers & Pages → Create → Worker.
2. Paste `worker/worker.js` in whole.
3. Fill in the keys at the top: Anthropic, fal.ai, and optionally Resend for
   password reset. Or set them as environment variables of the same names,
   which the code prefers over the constants.
   Set `ADMIN_EMAILS` to the comma-separated GrainDistrict account email(s)
   allowed to open the private AI cost dashboard. Keep this in Cloudflare,
   not in the repository.
4. Settings → Bindings → Add → **KV namespace** *or* **D1 database**, variable
   name exactly `GD_KV`. Either type works; the code detects which it got.
5. Deploy, then open the Worker's URL in a browser. It prints a plain-language
   status line for each key and for the store, and says what is missing.
6. Put the Worker's address in `index.html` as `WORKER`.

**Never commit the deployed copy back here.** The version running in Cloudflare
has real keys pasted into it. This one does not, and must not.

The cost dashboard writes one small, prompt-free usage record per successful AI
request. For production traffic, prefer a D1 binding over KV: the Worker supports
both, but D1 is a better fit once usage history grows beyond a small private beta.

## Running the tests

    ./tests/run.sh                # everything
    ./tests/run.sh testdrag.js    # one file

`APP` overrides which `index.html` is tested, `CHROME` which browser binary is
used. Playwright installs on first run.

The `.mjs` tests import `worker/worker.js` directly and run it against an
in-memory SQLite database, so the account and project endpoints are tested for
real without touching Cloudflare.

## The two things this repository cannot hold

**Your API keys.** Anthropic, fal.ai, Resend. They exist only in Cloudflare.
If you lose them, generate new ones from each provider's dashboard — nothing
here depends on the old values.

**Your accounts and saved projects.** They live in the KV namespace or D1
database bound to the Worker, and there is no copy of them here. Deleting that
binding's store deletes every account and every saved board, and this
repository cannot bring them back. If they matter, export the D1 database from
the Cloudflare dashboard from time to time, or open each project in the app and
use export.
