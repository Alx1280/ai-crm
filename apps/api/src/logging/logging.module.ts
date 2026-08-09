import {
	Global,
	type MiddlewareConsumer,
	Module,
	type NestModule,
	RequestMethod,
} from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { AllExceptionsFilter } from "./all-exceptions.filter";
import { ContextLogger } from "./context-logger";
import { PrismaLogBridge } from "./prisma-log.bridge";
import { RequestLoggerMiddleware } from "./request-logger.middleware";
import { UserContextInterceptor } from "./user-context.interceptor";

@Global()
@Module({
	providers: [
		ContextLogger,
		PrismaLogBridge,
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		{ provide: APP_INTERCEPTOR, useClass: UserContextInterceptor },
	],
	exports: [ContextLogger],
})
export class LoggingModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer
			.apply(RequestLoggerMiddleware)
			.forRoutes({ path: "{*splat}", method: RequestMethod.ALL });
	}
}
