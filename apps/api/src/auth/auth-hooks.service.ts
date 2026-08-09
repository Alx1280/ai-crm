import { Injectable, Logger } from "@nestjs/common";
import { AfterUpdate, DatabaseHook } from "@thallesp/nestjs-better-auth";
import { AuthService } from "./auth.service";

@DatabaseHook()
@Injectable()
export class AuthHooksService {
	private readonly logger = new Logger(AuthHooksService.name);

	constructor(private readonly authService: AuthService) {}

	@AfterUpdate("user")
	async onUserUpdated(user: { id: string }): Promise<void> {
		try {
			await this.authService.invalidateProfile(user.id);
		} catch (error) {
			this.logger.error(
				{ message: "Failed to invalidate cached profile", userId: user.id },
				error instanceof Error ? error.stack : String(error),
			);
		}
	}
}
