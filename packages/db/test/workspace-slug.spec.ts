import { describe, expect, it } from "bun:test";
import {
	DEFAULT_WORKSPACE_SLUG,
	MAX_SLUG,
	RESERVED_SLUGS,
	workspaceSlug,
} from "../src/workspace";

describe("workspaceSlug", () => {
	it("is the company name a rep can read in the address bar", () => {
		expect(workspaceSlug("Comp AI")).toBe("comp-ai");
		expect(workspaceSlug("Acme")).toBe("acme");
		expect(workspaceSlug("Northwind Savings Group")).toBe(
			"northwind-savings-group",
		);
	});

	it("keeps the punctuation out of the URL rather than escaping it", () => {
		expect(workspaceSlug("  Fernhill & Co.  ")).toBe("fernhill-co");
		expect(workspaceSlug("Reply.io")).toBe("reply-io");
		expect(workspaceSlug("Zoë Söderberg AB")).toBe("zoe-soderberg-ab");
	});

	it("never collides with a route the app already serves", () => {
		for (const reserved of RESERVED_SLUGS) {
			expect(workspaceSlug(reserved)).not.toBe(reserved);
		}

		expect(workspaceSlug("Settings")).toBe("settings-crm");
		expect(workspaceSlug("Sign In")).toBe("sign-in-crm");
	});

	it("falls back rather than producing an empty segment", () => {
		expect(workspaceSlug("")).toBe(DEFAULT_WORKSPACE_SLUG);
		expect(workspaceSlug("   ")).toBe(DEFAULT_WORKSPACE_SLUG);
		expect(workspaceSlug("——")).toBe(DEFAULT_WORKSPACE_SLUG);
		expect(workspaceSlug("株式会社")).toBe(DEFAULT_WORKSPACE_SLUG);
	});

	it("is bounded, and never ends on the dash the cut left behind", () => {
		const slug = workspaceSlug(`${"a".repeat(MAX_SLUG)} Holdings`);

		expect(slug).toHaveLength(MAX_SLUG);
		expect(slug.endsWith("-")).toBe(false);
	});

	it("gives one name one answer, whoever asks", () => {
		expect(workspaceSlug("Comp AI")).toBe(workspaceSlug("comp  ai"));
	});
});
