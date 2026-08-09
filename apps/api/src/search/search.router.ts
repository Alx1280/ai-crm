import { Inject } from "@nestjs/common";
import { Input, Query, Router, UseMiddlewares } from "nestjs-trpc";
import { z } from "zod";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { SearchService } from "./search.service";

const quickInput = z.object({ q: z.string().default("") });

@Router({ alias: "search" })
@UseMiddlewares(AuthMiddleware)
export class SearchRouter {
	constructor(@Inject(SearchService) private readonly search: SearchService) {}

	@Query({ input: quickInput })
	async quick(@Input("q") q: string) {
		return this.search.quick(q);
	}
}
