# Milestone 1 — Monorepo Migration Checklist

**Goal:** Move from the current single-app setup to a PNPM workspace monorepo without breaking auth.  
**Starting state:** Next.js 16 app at repo root (`inventory-xpert`).  
**End state:** `apps/web` runs correctly, `apps/mobile` scaffolded, four shared packages created, root scripts work.

---

## Prerequisites

- [ ] PNPM installed globally
  ```bash
  npm install -g pnpm
  pnpm --version   # must be 9+
  ```
- [ ] Node 20+ active
  ```bash
  node --version
  ```

---

## Step 1 — Create the workspace directory structure

```bash
# Run from repo root
mkdir -p apps/web apps/mobile
mkdir -p packages/types/src
mkdir -p packages/services/src
mkdir -p packages/utils/src
mkdir -p packages/config
```

---

## Step 2 — Move all current app files into `apps/web`

Run these from the repo root. **Order matters** — move files before directories.

```bash
# Config files
mv next.config.ts         apps/web/next.config.ts
mv tsconfig.json          apps/web/tsconfig.json
mv postcss.config.mjs     apps/web/postcss.config.mjs
mv eslint.config.mjs      apps/web/eslint.config.mjs
mv components.json        apps/web/components.json
mv global.d.ts            apps/web/global.d.ts
mv next-env.d.ts          apps/web/next-env.d.ts
mv proxy.ts               apps/web/proxy.ts

# App source folders
mv app      apps/web/app
mv components apps/web/components
mv lib      apps/web/lib
mv public   apps/web/public
```

> `README.md` and `package.json` stay at root and will be replaced in the next steps.

---

## Step 3 — Create `pnpm-workspace.yaml` at repo root

Create the file `/pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

---

## Step 4 — Replace root `package.json` with workspace root manifest

Replace the current root `package.json` entirely with:

```json
{
  "name": "inventaryexpert",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @inventaryexpert/web dev",
    "build": "pnpm --filter @inventaryexpert/web build",
    "start": "pnpm --filter @inventaryexpert/web start",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

---

## Step 5 — Create `apps/web/package.json`

Create the file `/apps/web/package.json`:

```json
{
  "name": "@inventaryexpert/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@inventaryexpert/types": "workspace:*",
    "@inventaryexpert/services": "workspace:*",
    "@inventaryexpert/utils": "workspace:*",
    "@base-ui/react": "^1.2.0",
    "@hugeicons/core-free-icons": "^3.3.0",
    "@hugeicons/react": "^1.1.5",
    "@supabase/ssr": "^0.9.0",
    "@supabase/supabase-js": "^2.98.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "next": "16.2.1",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "shadcn": "^3.8.5",
    "tailwind-merge": "^3.5.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Step 6 — Update `apps/web/tsconfig.json`

The existing `tsconfig.json` you moved works as-is. Verify the `paths` block still reads:

```json
"paths": {
  "@/*": ["./*"]
}
```

This alias already resolves correctly from inside `apps/web`, so no path changes are needed.

---

## Step 7 — Create `packages/types`

**`packages/types/package.json`**

```json
{
  "name": "@inventaryexpert/types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**`packages/types/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`packages/types/src/index.ts`**

```ts
// Shared platform types — expand as Milestone 2 schema is defined.

export type Sector = "construction" | "agriculture" | "sales" | "other";

export type UserRole = "admin" | "manager" | "storekeeper" | "worker";
```

---

## Step 8 — Create `packages/services`

**`packages/services/package.json`**

```json
{
  "name": "@inventaryexpert/services",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@inventaryexpert/types": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**`packages/services/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`packages/services/src/index.ts`**

```ts
// Shared inventory service layer — transaction engine lives here from Milestone 3.
// Placeholder until schema is ready.

export {};
```

---

## Step 9 — Create `packages/utils`

**`packages/utils/package.json`**

```json
{
  "name": "@inventaryexpert/utils",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

**`packages/utils/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "esnext"],
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

**`packages/utils/src/index.ts`**

```ts
// Shared utility functions — move framework-agnostic helpers here over time.

export {};
```

---

## Step 10 — Create `packages/config`

**`packages/config/package.json`**

```json
{
  "name": "@inventaryexpert/config",
  "version": "0.0.1",
  "private": true,
  "files": ["tsconfig.base.json"]
}
```

**`packages/config/tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

---

## Step 11 — Scaffold `apps/mobile`

**`apps/mobile/package.json`**

```json
{
  "name": "@inventaryexpert/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@inventaryexpert/types": "workspace:*",
    "expo": "~53.0.0",
    "expo-router": "~4.0.0",
    "react": "19.0.0",
    "react-native": "0.79.2"
  },
  "devDependencies": {
    "@babel/core": "^7",
    "@types/react": "^19",
    "typescript": "^5"
  }
}
```

> This is a placeholder scaffold. The Expo app will be properly bootstrapped during the mobile milestone. Do **not** run `expo start` yet — the mobile app is non-functional until Milestone 5.

---

## Step 12 — Install all workspace dependencies

```bash
# Run from repo root
pnpm install
```

This should:

- Create a single root `node_modules`
- Hoist shared deps
- Link `workspace:*` references between packages

Verify the lockfile was created at the root:

```bash
ls pnpm-lock.yaml
```

---

## Step 13 — Verify the web app runs

```bash
pnpm dev
# or directly:
pnpm --filter @inventaryexpert/web dev
```

Open `http://localhost:3000` and confirm:

- [ ] Home page loads
- [ ] `/login` loads without errors
- [ ] `/register` loads without errors
- [ ] Signing in redirects to `/dashboard`
- [ ] Signing out redirects to `/login`
- [ ] No TypeScript errors in terminal

---

## Step 14 — Verify root scripts work

```bash
# From repo root
pnpm lint        # should lint apps/web
pnpm typecheck   # should typecheck apps/web + all packages
```

---

## Acceptance Criteria

All of the following must be true before Milestone 1 is closed:

- [ ] `apps/web` runs independently via `pnpm dev` and all auth routes are functional
- [ ] `pnpm install` from repo root installs all packages without errors
- [ ] `workspace:*` references resolve: `@inventaryexpert/types`, `@inventaryexpert/services`, `@inventaryexpert/utils` are importable inside `apps/web`
- [ ] Root `pnpm lint` and `pnpm typecheck` scripts execute without errors
- [ ] `apps/mobile` package exists and is listed in the workspace but does not block the web app
- [ ] No app code lives at the repo root — all source is inside `apps/` or `packages/`
- [ ] Git history is preserved (all moves via `mv`, not copy+delete)

---

## Common Failure Points

| Symptom                                     | Cause                                                | Fix                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Cannot find module '@/*'` in `apps/web`    | `tsconfig.json` paths no longer relative to app root | Confirm `"@/*": ["./*"]` in `apps/web/tsconfig.json`                                                        |
| `workspace:*` package not resolved          | `pnpm-workspace.yaml` missing or wrong path          | Check `pnpm-workspace.yaml` includes `packages/*`                                                           |
| `next: command not found` from root         | Running `next dev` at root instead of filtering      | Use `pnpm --filter @inventaryexpert/web dev`                                                                |
| `Module not found: lib/supabase/...`        | Import path was absolute in a component              | All imports inside `apps/web` using `@/lib/...` are already correct                                         |
| `pnpm install` fails with peer dep warnings | React 19 peer dep mismatches from older packages     | Add `"peerDependencyRules": { "ignoreMissing": ["*"] }` to root `package.json` under `"pnpm"` key if needed |

---

## Next Step

Once all acceptance criteria are checked: **proceed to Milestone 2 — Shared Data Model and Access Control**.
