import { defineConfig } from "drizzle-kit";
import path from "path";

const dbUrl = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/ngtravels";

export default defineConfig({
  schema: "./src/schema/ng-travels.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
