import { Module } from "@nestjs/common";
import { TrpcModule } from "../trpc/trpc.module";
import { ConversationsRouter } from "./conversations.router";
import { ConversationsService } from "./conversations.service";

@Module({
	imports: [TrpcModule],
	providers: [ConversationsService, ConversationsRouter],
	exports: [ConversationsService],
})
export class ConversationsModule {}
