import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "api/app-router";

export type RouterOutputs = inferRouterOutputs<AppRouter>;
