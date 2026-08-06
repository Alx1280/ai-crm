import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TrpcModule } from "../trpc/trpc.module";
import { UsersRouter } from "./users.router";
import { UsersService } from "./users.service";

@Module({
	imports: [AuthModule, TrpcModule],
	providers: [UsersService, UsersRouter],
	exports: [UsersService],
})
export class UsersModule {}
