import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { SearchRouter } from "./search.router";
import { SearchService } from "./search.service";

@Module({
	imports: [TrpcModule],
	providers: [SearchService, SearchRouter],
})
export class SearchModule {}
