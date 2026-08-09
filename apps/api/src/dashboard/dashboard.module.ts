import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { DashboardRouter } from "./dashboard.router";
import { DashboardService } from "./dashboard.service";

@Module({
	imports: [TrpcModule],
	providers: [DashboardService, DashboardRouter],
})
export class DashboardModule {}
