# Project Structure (What each folder/file does)

This project is an **Expo Router + React Native + TypeScript** app for managing a **Family Subtree**.

---

## Core Concepts

### Recursive Subtree Model
The app uses a recursive data structure where each `Member` can contain a `subTree` of other members. This allows for:
- **Spouse Families**: Rendering a spouse's entire family tree within the main tree.
- **Reference Nodes**: Members can exist in multiple subtrees (e.g., a person appearing in their own family and their spouse's family) while maintaining synchronized data via shared IDs.
- **Dynamic Layout**: The layout engine automatically filters edges to only show connections between members currently visible in the active subtree.

---

## Top-level files

- `app.json`
  - Expo app configuration (name, icons, platform config).

- `package.json`
  - NPM dependencies + scripts (`start`, `android`, `ios`, `web`, `lint`).

- `tsconfig.json`
  - TypeScript config.

- `eslint.config.js`
  - Lint rules.

- `expo-env.d.ts`
  - TypeScript declarations for Expo environment variables.

- `README.md`
  - Project setup and basic usage.

- `PROGRESS.md`
  - Development notes/progress tracking.

- `idea.md`
  - Product notes/ideas.

---

## Folder: `app/` (Screens + navigation)

**What it is:**
- This is the main routing directory for **Expo Router**.
- Each file usually maps to a route (screen).

**Key screens:**

- `app/_layout.tsx`
  - Root navigation layout (Stack configuration).
  - Controls global header behavior for the app.

- `app/index.tsx`
  - Entry route.

- `app/login.tsx`
  - Login screen.
  - Sets the `currentUser` key in AsyncStorage (used as the active “profile”).

- `app/signup.tsx`
  - Signup screen.

- `app/family.tsx`
  - Family list / members overview.
  - Typically reads members from storage via the service layer.

- `app/tree.tsx`
  - **Main Family Tree** screen.
  - Loads family members from storage.
  - Computes tree layout using `utils/tree-layout.ts`.
  - Renders nodes using `components/tree/tree-node.tsx`.
  - Renders relationship edges using `react-native-svg`.
  - Contains the “quick add relationship” overlay modal.
  - Contains **Export/Import** features:
    - Export to a `.json` file (share/save)
    - Import from a `.json` file (document picker)
    - Web fallback: copy/paste JSON modal

- `app/member.tsx`
  - Member profile/details screen.
  - Shows member avatar, name, DOB, and relationship list.
  - Allows adding/removing/editing relationships.
  - Allows choosing a **profile picture** (saved into member `photo`).

- `app/add-member.tsx`
  - Screen for adding a new member.

- `app/add-relation.tsx`
  - Full-screen flow to add a relationship between members.
  - Uses a fixed list of "direct" relationship types (parent/child/spouse/sibling/partner/other).

- `app/modal.tsx`
  - Modal screen for various overlays.

- `app/profile.tsx`
  - "My profile" route.
  - Redirects the user to their corresponding Member screen (or tree if not found).

- `app/(tabs)/_layout.tsx`
  - A route-group layout for tab navigation.
  - This project uses tabs for some sections.

- `app/(tabs)/index.tsx`
  - Tab index screen.

- `app/(tabs)/profile.tsx`
  - Tab profile screen.

- `app/(modal)/add-relation.tsx`
  - Modal route for adding relations.

---

## Folder: `components/` (Reusable UI building blocks)

**What it is:**
- Shared components used across screens.

**Key files:**

- `components/themed-view.tsx`
  - Wrapper that applies theme-aware background/colors.

- `components/themed-text.tsx`
  - Theme-aware text component.

- `components/external-link.tsx`
  - Component for external links.

- `components/haptic-tab.tsx`
  - Haptic feedback for tabs.

- `components/hello-wave.tsx`
  - Hello wave component.

- `components/parallax-scroll-view.tsx`
  - Parallax scroll view component.

- `components/tree/tree-node.tsx`
  - Renders one person node in the tree:
    - Avatar + name pill
    - "+" buttons for adding child/sibling/spouse (when actions are shown)
    - "-" button for deletion in edit mode

- `components/ui/*`
  - Generic UI pieces (collapsible, icon components, etc.).

---

## Folder: `services/` (Data access layer)

**What it is:**
- Centralized persistence (instead of screens directly writing AsyncStorage).

**Key file:**

- `services/family-service.ts`
  - `getFamily(userKey)`
    - Reads the family list for the active user.
  - `saveFamily(userKey, members)`
    - Persists the updated family list.
  - `resetFamily(userKey)`
    - Clears the family list for that user.

**Storage model (high level):**
- `currentUser` → the active logged-in user key
- `${currentUser}:family` → array of `Member`

---

## Folder: `types/` (Shared TypeScript types)

**What it is:**
- App-wide types used by services, screens, and utils.

**Key file:**

- `types/family.ts`
  - `Member`
    - `id`, `name`, optional `dob`, optional `email`, optional `photo`, and `relations[]`
  - `Relation`
    - `type` + `targetId`
  - `TreeLayout`
    - Layout output for rendering (layers, positions, edges)

---

## Folder: `utils/` (Algorithms / pure helpers)

**What it is:**
- Non-UI logic used by screens.

**Key file:**

- `utils/tree-layout.ts`
  - `calculateTreeLayout(members, screenWidth)`
    - Builds the generation layers
    - Calculates node positions
    - Produces edges for parent/child and spouse links

---

## Folder: `hooks/` (Custom React hooks)

**What it is:**
- Shared hooks for theme/color handling.

**Key files:**
- `hooks/use-theme-color.ts`
- `hooks/use-color-scheme.ts`
- `hooks/use-color-scheme.web.ts`

---

## Folder: `constants/` (Theme constants)

- `constants/theme.ts`
  - Theme tokens/colors used by `useThemeColor`.

---

## Folder: `assets/` (Static images)

- `assets/images/*`
  - App icons, splash assets, etc.

---

## Folder: `scripts/` (Dev scripts)

- `scripts/reset-project.js`
  - Utility script for resetting project state.

---
## Folder: `notes/` (Documentation)

- `notes/PROJECT_STRUCTURE.md`
  - This file: detailed project structure and file purposes.

---
## “Big picture” user flows

- Login → sets `currentUser`.
- Tree screen loads `${currentUser}:family` via `FamilyService`.
- If family is empty, Tree creates a default “Me” member.
- Tapping a node:
  - First tap: selects it and shows “+” actions
  - Second tap: opens the member profile
- Picking a profile photo:
  - Stored as `member.photo` and saved via `FamilyService.saveFamily`.

- Export family tree:
  - Creates a JSON export of the current `Member[]`.
  - On mobile: writes a `.json` file and opens the native share sheet.
  - On web: shows the JSON in a modal for copy/paste.

- Import family tree:
  - On mobile: user picks a `.json` file; app validates + saves it.
  - On web: user pastes JSON; app validates + saves it.

---

## Expo modules used (feature dependencies)

- `expo-image-picker`
  - Lets the user choose a profile picture.

- `expo-file-system` (used via `expo-file-system/legacy` in code)
  - Writes/reads the exported `.json` file.

- `expo-sharing`
  - Opens the native share sheet for the exported `.json` file.

- `expo-document-picker`
  - Lets the user pick a `.json` file to import.

---

## Where to start reading

1. `app/tree.tsx` (main UX + layout + quick add)
2. `components/tree/tree-node.tsx` (node UI)
3. `utils/tree-layout.ts` (layout algorithm)
4. `services/family-service.ts` + `types/family.ts` (data model + persistence)
