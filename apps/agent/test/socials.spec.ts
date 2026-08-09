import { describe, expect, it } from "bun:test";
import { namesMatch } from "../agent/lib/names";
import { extractSocialUrls, parseSocialUrl } from "../agent/lib/socials";

describe("parseSocialUrl", () => {
	it("reads a profile on either X hostname", () => {
		expect(parseSocialUrl("https://x.com/lewiscarhart")).toEqual({
			network: "x",
			handle: "lewiscarhart",
			url: "https://x.com/lewiscarhart",
		});
		expect(parseSocialUrl("https://twitter.com/LewisCarhart")?.url).toBe(
			"https://x.com/LewisCarhart",
		);
		expect(parseSocialUrl("https://mobile.twitter.com/@lewis")?.handle).toBe(
			"lewis",
		);
	});

	it("refuses a deep link, which is where most wrong handles come from", () => {
		expect(parseSocialUrl("https://x.com/someone/status/1234")).toBeNull();
		expect(parseSocialUrl("https://github.com/someone/some-repo")).toBeNull();
	});

	it("refuses site paths that parse like a username", () => {
		expect(parseSocialUrl("https://github.com/pricing")).toBeNull();
		expect(parseSocialUrl("https://github.com/orgs")).toBeNull();
		expect(parseSocialUrl("https://x.com/settings")).toBeNull();
		expect(parseSocialUrl("https://x.com/i")).toBeNull();
	});

	it("refuses handles neither network could issue", () => {
		expect(parseSocialUrl("https://x.com/waytoolongforanxhandle")).toBeNull();
		expect(parseSocialUrl("https://github.com/-lewis")).toBeNull();
		expect(parseSocialUrl("https://github.com/lewis--carhart")).toBeNull();
	});

	it("ignores anything that is not one of the two networks", () => {
		expect(parseSocialUrl("https://linkedin.com/in/lewiscarhart")).toBeNull();
		expect(parseSocialUrl("not a url")).toBeNull();
		expect(parseSocialUrl("")).toBeNull();
	});
});

describe("extractSocialUrls", () => {
	it("pulls profiles out of prose and citations, deduplicated", () => {
		const found = extractSocialUrls([
			"You can find him at https://github.com/lewiscarhart and https://x.com/lewiscarhart.",
			"https://github.com/lewiscarhart",
			"https://github.com/lewiscarhart/crm",
		]);

		expect(found.map((f) => f.url)).toEqual([
			"https://github.com/lewiscarhart",
			"https://x.com/lewiscarhart",
		]);
	});

	it("finds nothing in an answer that cites nothing", () => {
		expect(extractSocialUrls(["I could not find a GitHub profile."])).toEqual(
			[],
		);
	});
});

describe("namesMatch", () => {
	it("accepts the same person written two ways", () => {
		expect(namesMatch("Lewis Carhart", "Lewis Carhart")).toBe(true);
		expect(namesMatch("Lewis J. Carhart", "Lewis Carhart")).toBe(true);
		expect(namesMatch("lewis carhart", "Lewis Carhart")).toBe(true);
	});

	it("rejects a near miss", () => {
		expect(namesMatch("Lewis Carter", "Lewis Carhart")).toBe(false);
		expect(namesMatch("Louis Carhart", "Lewis Carhart")).toBe(false);
	});

	it("rejects a first name on its own", () => {
		expect(namesMatch("Lewis", "Lewis Carhart")).toBe(false);
		expect(namesMatch(null, "Lewis Carhart")).toBe(false);
	});
});
