import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { ActivitiesRouter } from "./activities.router";
import { ActivitiesService } from "./activities.service";

@Module({
	imports: [TrpcModule],
	providers: [ActivitiesService, ActivitiesRouter],
	exports: [ActivitiesService],
})
export class ActivitiesModule {}
