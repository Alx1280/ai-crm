import { describe, expect, it } from "bun:test";
import { notifySignedIn, onSignedIn } from "../src/signed-in";

const USER = { id: "u1", email: "rep@acme.com" };

describe("the signed-in registry", () => {
	it("hands the user to everything registered", async () => {
		const seen: string[] = [];
		onSignedIn((user) => {
			seen.push(`a:${user.email}`);
		});
		onSignedIn((user) => {
			seen.push(`b:${user.id}`);
		});

		await notifySignedIn(USER);

		expect(seen).toEqual(["a:rep@acme.com", "b:u1"]);
	});

	it("does not let a failing handler fail the sign-in", async () => {
		const after: string[] = [];
		onSignedIn(() => {
			throw new Error("backfill exploded");
		});
		onSignedIn(() => {
			after.push("still ran");
		});

		await expect(notifySignedIn(USER)).resolves.toBeUndefined();
		expect(after).toEqual(["still ran"]);
	});
});
