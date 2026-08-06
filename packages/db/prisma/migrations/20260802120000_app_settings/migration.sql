-- Install-wide settings a rep can change, starting with the agent's model.
--
-- One row, id pinned to 'app' by `@crm/db/settings`. No unique constraint
-- enforces that beyond the primary key, because the id is not derived from
-- anything: a second row can only appear if something writes a different
-- literal, and every writer goes through `writeAgentModel`.
CREATE TABLE "appSetting" (
    "id" TEXT NOT NULL,
    "agentModelId" TEXT,
    "agentModelContextWindow" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appSetting_pkey" PRIMARY KEY ("id")
);

-- Deliberately not seeded. An absent row means "follow the built-in default",
-- and writing the current default in here would freeze it: the next time
-- DEFAULT_AGENT_MODEL changes, every existing install would keep running the
-- old model while reporting itself as unconfigured.
