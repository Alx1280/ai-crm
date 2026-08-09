import { describe, expect, it } from "bun:test";
import {
	CALENDAR_SCOPE,
	GMAIL_SCOPE,
	hasSyncScopes,
	parseScopes,
	SYNC_SCOPES,
} from "@crm/auth/scopes";

const BOTH = `openid,email,profile,${GMAIL_SCOPE},${CALENDAR_SCOPE}`;

describe("parseScopes", () => {
	it("handles the comma form Better Auth stores", () => {
		expect(parseScopes("a,b,c")).toEqual(new Set(["a", "b", "c"]));
	});

	it("handles the space form Google returns", () => {
		expect(parseScopes("a b c")).toEqual(new Set(["a", "b", "c"]));
	});

	it("is empty for null, undefined and blank", () => {
		for (const value of [null, undefined, "", "   "]) {
			expect(parseScopes(value).size).toBe(0);
		}
	});
});

describe("hasSyncScopes", () => {
	it("is true only when both scopes are present", () => {
		expect(hasSyncScopes(BOTH)).toBe(true);
	});

	it("is false when granular consent dropped one of them", () => {
		expect(hasSyncScopes(`openid,email,profile,${GMAIL_SCOPE}`)).toBe(false);
		expect(hasSyncScopes(`openid,email,profile,${CALENDAR_SCOPE}`)).toBe(false);
	});

	it("is false for an account that predates the requirement", () => {
		expect(hasSyncScopes("openid,email,profile")).toBe(false);
	});

	it("is false when the grant was revoked and the column cleared", () => {
		expect(hasSyncScopes(null)).toBe(false);
	});

	it("does not match on a prefix", () => {
		expect(hasSyncScopes(`${GMAIL_SCOPE}.metadata,${CALENDAR_SCOPE}`)).toBe(
			false,
		);
	});

	it("covers exactly the scopes the provider requests", () => {
		expect(hasSyncScopes(SYNC_SCOPES.join(","))).toBe(true);
	});
});
