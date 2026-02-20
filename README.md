# Collab Workspace

A **Notion / Linear–style** mini app built with **Next.js App Router**, **TypeScript**, and **Tailwind CSS**. It demonstrates workspaces, documents with a block editor, a Linear-style issues board, comments with @mentions, mock local auth, a command palette, and real-time collaboration via **Yjs** with a WebSocket-style client transport (BroadcastChannel + `localStorage`).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with a demo user.

```bash
npm run build
npm start
```

## Features

| Area | Description |
|------|-------------|
| **Workspaces & projects** | Sample data with dashboard and per-project boards |
| **Documents** | Block editor (headings, lists, todos, code, `/` slash menu) |
| **Realtime** | Yjs CRDT for block sync + awareness / presence |
| **Issues** | Kanban columns, drag-and-drop, assignee & priority |
| **Comments** | Threaded comments with `@mention` parsing |
| **Auth** | Demo user picker, session in `localStorage` |
| **UI** | Sidebar navigation, ⌘K command palette, presence avatars |
| **Persistence** | Workspace snapshot via Zustand + `localStorage` |

## Project structure

```
collab-workspace/
├── public/
├── src/
│   ├── app/                 # App Router routes
│   ├── components/          # UI, layout, editor, issues, comments, presence
│   ├── hooks/               # Collab, document blocks, command palette
│   ├── lib/                 # Auth, persistence, Yjs room, sample data
│   ├── store/               # Zustand stores
│   └── types/               # Shared TypeScript types
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Multi-tab collaboration demo

Open the same document in two browser tabs while signed in as different demo users. Edits sync through Yjs; presence avatars appear in the header.

## License

MIT (sample project).
<!-- progress: refactor: extract mention utility helpers -->

<!-- progress: feat: improve empty states on boards -->
