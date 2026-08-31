---
name: Stack compatibility
description: Compatibility notes for generated validators and Clerk's React runtime in this workspace.
---

Generated API validators use Zod 4 APIs such as top-level integer and email helpers, so the workspace catalog must keep Zod on the 4.x line. Clerk's current React package also requires the React 19.1.4 patch line; React 19.1.0 produced browser invalid-hook failures despite passing TypeScript.

**Why:** The generated code and Clerk runtime can fail independently of static checks when their peer/runtime versions are older than the packages that consume them.

**How to apply:** Keep the catalog versions aligned with Orval's generated Zod API and Clerk's declared React peer range before regenerating clients or changing authentication UI.