import { Global, Module } from "@nestjs/common";
import { ActivityStampService } from "./activity-stamp.service";
import { EnrichmentLogService } from "./enrichment-log.service";

@Global()
@Module({
	providers: [ActivityStampService, EnrichmentLogService],
	exports: [ActivityStampService, EnrichmentLogService],
})
export class CrmModule {}
