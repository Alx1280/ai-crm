import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { DealsRouter } from "./deals.router";
import { DealsService } from "./deals.service";

@Module({
	imports: [TrpcModule],
	providers: [DealsService, DealsRouter],
	exports: [DealsService],
})
export class DealsModule {}
