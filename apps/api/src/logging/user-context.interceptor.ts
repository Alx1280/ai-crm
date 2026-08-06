import {
	type CallHandler,
	type ExecutionContext,
	Injectable,
	type NestInterceptor,
} from "@nestjs/common";
import type { Request } from "express";
import type { Observable } from "rxjs";
import { setRequestUserId } from "./request-context";

@Injectable()
export class UserContextInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		if (context.getType() !== "http") {
			return next.handle();
		}

		const request = context
			.switchToHttp()
			.getRequest<Request & { session?: { user?: { id?: string } } }>();
		const userId = request.session?.user?.id;

		if (userId) {
			setRequestUserId(userId);
		}

		return next.handle();
	}
}
