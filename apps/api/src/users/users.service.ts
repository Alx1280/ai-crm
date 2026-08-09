import type { Db } from "@crm/db";
import { Injectable } from "@nestjs/common";
import { InjectDatabase } from "../database/database.constants";

export interface UserOption {
	id: string;
	name: string;
	email: string;
	image: string | null;
}

@Injectable()
export class UsersService {
	constructor(@InjectDatabase() private readonly db: Db) {}

	async list(): Promise<UserOption[]> {
		return this.db.user.findMany({
			select: { id: true, name: true, email: true, image: true },
			orderBy: [{ name: "asc" }, { email: "asc" }],
		});
	}
}
