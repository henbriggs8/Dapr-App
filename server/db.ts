import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import { assertStagingConfiguration, postgresPoolConfig } from "./runtime-policy";

assertStagingConfiguration();

export const pool = new Pool(postgresPoolConfig());
pool.on("error", () => console.error("[database] Unexpected idle connection error"));
export const db = drizzle({ client: pool, schema });
