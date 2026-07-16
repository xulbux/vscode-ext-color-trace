# Project Rules

-   This project uses **pnpm** as its package manager. Always use `pnpm` (e.g., `pnpm i`, `pnpm run <script>`, `pnpm exec <tool>`, `pnpm dlx <tool>`). Never use `npm`, `npx`, or `yarn`.
-   After making code changes, ALWAYS run `pnpm run type-check; pnpm run lint; pnpm run fmt; pnpm run compile` to validate the codebase.
-   Fix all problems and warnings that arise from the validation suite until the output is clean.
