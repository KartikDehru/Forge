# Forge

Realtime docs and issue tracking for product teams. Specs live next to the issues that implement them, and everyone sees edits, cursors and status changes as they happen.

Forge is a Next.js App Router application written in TypeScript with Tailwind CSS. All business rules live in a framework-free domain layer that is covered by tests.

## Features

- **Issue board** with the status flow backlog → todo → in progress → in review → done (plus canceled), filters for assignee, priority and label, search, and keyboard shortcuts.
- **Block editor** with nested blocks, drag and keyboard reordering, Enter to split, Backspace to merge, a `/` slash menu and `@mentions`. Edits are debounced before being persisted.
- **Live collaboration** built on Yjs: text-level merging, presence with cursor and selection, and a visible connection state (connected, reconnecting, offline).
- **Roles and permissions**: owner, admin, member and guest, enforced in every store action, not just hidden in the UI.
- **Activity feed** (`/activity`) recording issue creation, status changes, page edits and comments, plus a **notification bell** derived from it (mentions and assignments).
- **Settings**: rename the workspace, invite members, change roles, remove members.
- **Command palette** (`Cmd/Ctrl+K`) and global shortcuts. Press `?` for the full list.

## Keyboard shortcuts

| Keys | Action |
| --- | --- |
| `Cmd/Ctrl+K` | Open the command palette |
| `c` | Create an issue |
| `/` | Focus the issue search (on the board) or open the slash menu (in the editor) |
| `g` then `d` / `i` / `a` / `s` | Go to dashboard, issues, activity, settings |
| `?` | Show all shortcuts |

## Run locally

Requires Node 18.18 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm start
```

There are no accounts or passwords. The sign-in screen lists the people in the seeded workspaces so you can open Forge as any of them and see the role-based behavior. Open two tabs as different people to try collaboration.

## Testing

```bash
npm test             # Vitest, single run
npm run test:watch   # watch mode
npm run typecheck    # tsc --noEmit
npm run lint         # next lint
```

CI (`.github/workflows/ci.yml`) runs install, lint, typecheck, tests and build on Node 18, 20 and 22.

What is covered:

| Area | Tests |
| --- | --- |
| Status machine, filtering, identifiers | `src/domain/issues.test.ts` |
| Block tree: split, merge, indent, move, reorder | `src/domain/blocks.test.ts` |
| Mention parsing and autocomplete | `src/domain/mentions.test.ts` |
| Permission matrix | `src/domain/permissions.test.ts` |
| Activity coalescing and notifications | `src/domain/activity.test.ts` |
| Yjs sync, convergence, heartbeats, presence expiry | `src/lib/collab/collab.test.ts` |
| Store actions: permission gating, activity, invites | `src/store/workspace-store.test.ts` |
| Dialog and slash menu accessibility | `src/components/**/*.test.tsx` |

## Architecture

```
src/
  domain/        Pure rules: no React, no storage, no Date.now() hidden inside
  lib/collab/    Yjs room, sync protocol, transports, heartbeats
  store/         Zustand stores that compose domain functions
  hooks/         Editor, collaboration, shortcut and focus hooks
  components/    UI grouped by feature
  app/           Routes (App Router)
```

### Domain layer

`src/domain` holds every rule worth testing, and every function returns a `Result<T, DomainError>` instead of throwing. Errors carry a `code` (`FORBIDDEN`, `INVALID_TRANSITION`, `ASSIGNEE_REQUIRED`, `VALIDATION`, `CONFLICT`, ...) and an optional `field`, so forms can show them next to the right input.

- **Status machine**: moving forward is one step at a time, moving back can go to any earlier step, cancel is available from open states only and never from done, and a canceled issue can only be reopened to backlog. In progress, in review and done require an assignee.
- **Permissions**: a role → permission matrix with `can` and `authorize`. Only owners and admins delete issues, invite people and change settings; guests can comment but not create.
- **Blocks**: a flat list with a `depth` per block, so the tree stays trivially mergeable in Yjs. Operations (insert, delete, move, indent, outdent, split, merge) are pure functions over that list.
- **Mentions**: handles resolve longest first (full name, unique first name, email local part). Ambiguous handles are not resolved.
- **Activity**: successive edits to one page by one person are coalesced inside a five-minute window. Notifications are computed from the activity stream and a per-user read marker; nothing is stored twice.

### Collaboration

Each page is a top-level `Y.Map` of blocks, and each block's text is a `Y.Text`, so two people typing in the same block merge instead of overwriting. Only local transactions are persisted and recorded as activity, so remote updates never echo back.

The sync protocol is: a joining peer sends its state vector, receives the missing diff plus the responder's state vector, and answers with whatever the responder lacks. After that, incremental updates, presence and heartbeats flow. Heartbeats are sent at a fixed interval with a sequence number, and a peer is dropped when three beats are missed. The clock is injectable, which is how the tests stay deterministic.

The room talks to a `Transport` interface. The bundled `BroadcastTransport` uses `BroadcastChannel`, handles online/offline and tab visibility, and reports `connecting`, `connected`, `reconnecting` or `offline`. `MemoryTransport` connects rooms in-process for tests.

### Persistence and its limits

Forge has no backend. Workspace data and the signed-in identity are stored in this browser's `localStorage`, versioned with a migration hook, and synchronized between tabs through the `storage` event.

That has consequences you should know about:

- Data is per browser profile. Clearing site data erases it, and nothing is shared across machines.
- Realtime collaboration works between tabs and windows of the same browser profile. It does not reach other people on other devices.
- Permissions are enforced in client code, so they protect the workflow rather than act as a security boundary.

Because collaboration is behind `Transport` and persistence is behind store actions that return `Result`, moving to a server means adding a WebSocket transport and replacing the store's storage, not rewriting features. Owners can reset the seeded data from **Settings → Data**.

## Design

Warm charcoal surfaces with parchment text and a single amber accent. Type is DM Sans for the interface and IBM Plex Mono for identifiers and keys, both loaded through `next/font`. Corners are tight (4-8px), avatars are square, and depth comes from borders rather than shadows. Motion is limited to the sidebar width, the palette and dialog entrance, and staggered board columns, and it is turned off under `prefers-reduced-motion`.
