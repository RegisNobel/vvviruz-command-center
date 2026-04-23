# vvviruz' command center

`vvviruz' command center` is a local-first creative operating system for managing music releases, building short lyric videos, and organizing promotional copy in one place.

It is intentionally built as a single-owner internal tool rather than a SaaS product. The app prioritizes fast iteration, clean UX, and production-minded admin security over multi-user complexity.

## Project Summary

This project combines a release tracker, a lyric video studio, and a copywriting workspace into one Next.js app with a secure admin boundary under `/admin`.

The core idea is simple: keep the full creative workflow local, fast, and organized.

- plan and track releases
- generate lyric videos with live preview and export
- connect clips and copy directly to releases
- run everything from local storage with no cloud dependency

## Why This Project Is Interesting

- It is a full-stack internal product, not a static portfolio shell.
- It includes a real admin/auth boundary with server-enforced sessions and TOTP-based 2FA.
- It mixes product thinking, workflow design, media tooling, and local-first architecture.
- It uses Remotion, FFmpeg, and Whisper together inside a modern App Router stack.
- It is designed to support an artist workflow end to end instead of solving one isolated UI problem.

## Core Modules

### Admin Command Center

Protected admin workspace under `/admin` with a dark command-center UI and shared navigation across tools.

### Releases

Release planning and execution workspace with:

- release metadata
- ordered stage progression
- tasks
- cover art references
- streaming links
- linked lyric clips
- linked copy entries
- pinning and search

### Lyric Lab

Short-form lyric video builder with:

- release-aware project setup
- audio upload and trimming
- local transcription
- lyric timing edits
- live Remotion preview
- style controls
- MP4 export
- SRT export

### Copy Lab

Hook/caption management workspace with:

- simple CRUD
- copy types
- optional release linking
- standalone neutral copy support

### Photo Lab

Placeholder route for future cover art generation workflows.

### Analytics

Placeholder route for future reporting and performance views.

## Feature Highlights

### Secure Admin Boundary

- `/admin` route namespace
- username/password login
- TOTP-based 2FA
- server-side sessions
- httpOnly cookies
- middleware and server-side protection for admin routes and private APIs

### Release Management

- release detail editing
- UPC and ISRC tracking
- collaborator tracking
- release date and concept management
- ordered stage progression with cover art as a required gate before beat completion
- computed snapshot, next action, and blockers
- generated clips section
- linked copy section

### Lyric Video Workflow

- waveform-based trim flow for clips over 30 seconds
- local Whisper transcription with English, French, Spanish, and auto-detect
- lyric line editing and retiming
- live preview updates with Remotion Player
- `9:16` and `16:9` aspect ratio support
- draggable lyric placement in preview
- solid, gradient, motion, photo, and video backgrounds
- H.264/AAC export

### Copy Workflow

- hook and caption pairing
- release-linked or standalone entries
- reusable copy type system for content ideation

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Remotion
- FFmpeg via `ffmpeg-static`
- FFprobe via `ffprobe-static`
- local Whisper via `@remotion/install-whisper-cpp`
- SQLite
- Prisma
- local filesystem storage for media assets

## Persistence Model

Structured app data now lives in a local SQLite database managed through Prisma.

Database-backed data:

- releases
- release tasks
- release streaming links
- lyric lab project metadata
- lyric lines and timing
- copy lab entries
- admin user metadata
- admin sessions

Filesystem-backed data:

- uploaded audio
- uploaded background photos and videos
- cover art files
- exported media
- Whisper model files
- other local binary assets under `storage/`

Legacy JSON files under `storage/releases`, `storage/copies`, `storage/projects`, and `storage/auth` are now treated as import/back-up source material rather than the primary source of truth.

## Architecture Notes

- Local-first storage under `storage/`
- SQLite database file at `storage/vvviruz-command-center.db`
- Prisma as the relational data layer and migration system
- Thin repository layer under `lib/repositories/*`
- File system remains the home for large media assets
- Single server process
- No cloud storage
- No background worker layer
- No Stripe, auth SaaS, or multi-user system
- Public `/` remains open for future public-site work
- Private command center lives under `/admin`

## Local Development

1. Install dependencies

```bash
npm install
```

2. Install Whisper locally

```bash
npm run setup:whisper
```

3. Create local env vars in `.env.local`

```bash
DATABASE_URL=file:../storage/vvviruz-command-center.db
AUTH_SECRET=your-generated-secret
ADMIN_USERNAME=owner
ADMIN_PASSWORD_HASH=your-generated-password-hash
ADMIN_TOTP_ISSUER=vvviruz Command Center
ADMIN_SESSION_TTL_HOURS=12
ADMIN_PREAUTH_TTL_MINUTES=10
```

4. Generate the Prisma client and apply the tracked schema

```bash
npm run db:generate
npm run db:migrate:deploy
```

5. If you are migrating an existing local JSON workspace, import it once

```bash
npm run db:import
```

6. Start the app

```bash
npm run dev
```

7. Open:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Docker v1

The repo includes a Dockerized `v1` setup for the secured app.

### Build and Run

1. Copy `.env.docker.example` to `.env.docker`
2. Fill in the Docker runtime env vars
3. Start the app

```bash
docker compose up --build -d
```

4. The container entrypoint applies Prisma migrations automatically on boot.

5. If you are migrating an existing local JSON workspace mounted under `storage/`, import it once:

```bash
docker compose exec app npm run db:import
```

6. If Whisper models are not installed yet:

```bash
docker compose exec app npm run setup:whisper
```

7. Open:

- [http://localhost:3000](http://localhost:3000)
- [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Useful Commands

```bash
npm install
npm run db:generate
npm run db:migrate:dev -- --name your_change_name
npm run db:migrate:deploy
npm run db:import
npm run dev
npm run build
npm run lint
npm run typecheck
npm run setup:whisper
npm run sync:releases
npm run normalize:releases
docker compose up --build -d
```

## Repo Notes

- This repository intentionally excludes local auth secrets, local media, local exports, and local storage records.
- The SQLite database file under `storage/` is intentionally excluded from source control.
- The GitHub version is source-focused and safe to review publicly.
- The app itself is designed as a private owner-operated command center, not a public SaaS product.

## Recent Updates

### 2026-04-22 23:08 -04:00

- Made the `Release planning` header block on the releases page sticky so it stays visible while scrolling through the release list.
- Matched the sticky state to the command-center theme with a darker surface, stronger border separation, and backdrop blur under the admin navbar.

### 2026-04-22 22:00 -04:00

- Enforced release stage progression in order: concept, cover art, beat made, lyrics, recorded, mix/mastered, then published.
- Updated the release snapshot so `Current Stage`, `Next Action`, and `Blockers` all follow the same ordered stage model.
- Inserted cover art into the stage flow as a required gate without adding a new checkbox field.
- Reordered the release detail sections so concept, cover art, lyrics, and stage completion now follow a clearer working order.
- Updated shared release stage labeling so the release list and release detail page stay in sync.

### 2026-04-21 16:36 -04:00

- Migrated structured app persistence from ad hoc JSON files to SQLite via Prisma.
- Added a repository layer under `lib/repositories/*` so route handlers and components can keep stable contracts while storage lives behind cleaner adapters.
- Moved releases, release tasks, release streaming links, lyric project metadata, lyric lines, copy entries, admin user metadata, and admin sessions into the database.
- Kept large media assets and generated files on disk under `storage/` and `whisper.cpp`.
- Added Prisma scripts, initial migration files, JSON-to-SQLite import tooling, and Docker migration support.
- Imported the current local JSON workspace into SQLite and verified the migration counts.

### 2026-04-21 15:26 -04:00

- Rewrote the README into a cleaner public-facing project overview.
- Tightened the positioning so the repo reads well for recruiter and portfolio review.
- Prepared the repository for public visibility.

### 2026-04-21 14:46 -04:00

- Updated WSL and verified the Dockerized `v1` app runs successfully on port `3000`.

### 2026-04-21 01:55 -04:00

- Completed the secure `/admin` lockdown with server-enforced auth, sessions, and TOTP-based 2FA.
