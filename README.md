# sample-app

A deliberately tiny app for testing auto-preview, with nothing project-specific in it.
It is laid out as a **standalone consumer repo**: copy this folder out and push it as its
own repository (the workflow only runs from `.github/workflows/` at a repo's root).

```
frontend (nginx, static)  --cross-origin-->  api (node, no deps)  --tcp-->  db (postgres)
                                                  \--http--> extras (only with label preview:extras)
```

The page shows what the preview looks like from the inside: PR number, commit, whether
the database is reachable, whether `extras` is running, and whether the `PREVIEW_ENV`
secret arrived. So every feature of the contract is visible in the browser.

## One-time setup

1. Push the `auto-preview` repo (this repo's parent) to GitHub. If private, enable
   Settings → Actions → General → Access so other repos can call it.
2. Copy `examples/sample-app/` into a **new repo** and push it to `main`.
3. In `.github/workflows/preview.yml` replace `OWNER` (use `@main` until you tag `v1`).
4. Create the labels in the sample repo:
   ```sh
   gh label create preview --color 0E8A16 --description "Run a preview environment"
   gh label create "preview:extras" --color 5319E7 --description "Preview + extras profile"
   gh label create bug --color D73A4A     # unrelated label, used in test 5
   ```

## Test plan

Make a branch **in the same repo** (not a fork), change anything, open a PR, then:

| # | Do this | Expect |
|---|---|---|
| 1 | Add label `preview` | Comment goes *building* → *live* with two URLs. The page loads, shows the PR number and commit, database **reachable**, extras **not running**, secret **not set**. |
| 2 | Add repo secret `PREVIEW_ENV` = `SAMPLE_SECRET=anything-long` (see `.preview/preview.env.example`), then remove and re-add `preview` | Page shows secret **set**. The value never appears in the logs or the page. |
| 3 | Add label `preview:extras` | Rebuilds; extras **running**. Remove it: extras **not running** again. |
| 4 | Edit `MESSAGE` in `.preview/docker-compose.yml`, push | Old run is cancelled, a new one builds, the page shows the new message and commit. |
| 5 | Add the unrelated label `bug` while live | Nothing happens; the preview stays up. |
| 6 | Remove `preview` | Comment becomes *stopped* quickly; the URLs stop resolving. |
| 7 | Add `preview` again, then close the PR | Fresh preview, then *stopped* on close. |
| 8 | Wait out the TTL (10 min here) | Comment becomes *expired*. |
| 9 | Break it: change the api healthcheck path to `/nope`, push with the label on | Comment says *failed*; the run log has container logs. |
| 10 | Open a PR from a **fork**, ask a maintainer to add `preview` | Nothing runs (fork PRs are ignored by design). |

Tests 5 and 6 are the ones that check the concurrency assumptions flagged in the main README.

## Run it without GitHub

You can check the stack locally with Docker, using localhost in place of tunnel URLs:

```sh
cp .preview/preview.env.example .preview/preview.env
cat > .preview/urls.env <<EOF
PREVIEW_ENV_FILE=$PWD/.preview/preview.env
PREVIEW_PR_NUMBER=1
PREVIEW_SHA=local000
PREVIEW_URL_API=http://localhost:8000
PREVIEW_URL_FRONTEND=http://localhost:3000
EOF
COMPOSE_FILE=.preview/docker-compose.yml COMPOSE_PROJECT_NAME=preview \
COMPOSE_ENV_FILES=.preview/preview.env,.preview/urls.env \
COMPOSE_PROFILES=extras docker compose up --build --wait
# open http://localhost:3000   (drop COMPOSE_PROFILES to see extras "not running")

# clean up (the profile flag matters: a plain `down` leaves profile services running)
docker compose --profile '*' down -v --remove-orphans
```
