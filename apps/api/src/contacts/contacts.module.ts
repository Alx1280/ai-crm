import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { CompaniesModule } from "../companies/companies.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ContactsRouter } from "./contacts.router";
import { ContactsService } from "./contacts.service";

@Module({
	imports: [TrpcModule, AgentModule, CompaniesModule],
	providers: [ContactsService, ContactsRouter],
	exports: [ContactsService],
})
export class ContactsModule {}
