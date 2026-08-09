import { describe, expect, it } from "bun:test";
import { parseEnv } from "../src/index";

describe("parseEnv", () => {
	it("reads plain and quoted values", () => {
		expect(
			parseEnv(`
				DATABASE_URL="postgresql://postgres:postgres@localhost:5432/crm"
				PORT=3001
				SINGLE='single quoted'
			`),
		).toEqual({
			DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/crm",
			PORT: "3001",
			SINGLE: "single quoted",
		});
	});

	it("ignores comments and blank lines", () => {
		expect(
			parseEnv(["# a heading", "", "  # indented", "A=1", ""].join("\n")),
		).toEqual({ A: "1" });
	});

	it("keeps a # that is part of the value", () => {
		expect(parseEnv("PASSWORD=pa#ssword\nPORT=3001 # the api")).toEqual({
			PASSWORD: "pa#ssword",
			PORT: "3001",
		});
	});

	it("does not treat a hash inside quotes as a comment", () => {
		expect(parseEnv('SECRET="abc # def"')).toEqual({ SECRET: "abc # def" });
	});

	it("keeps base64 padding, which openssl rand emits", () => {
		const secret = "6oXI/PGPx8OGGiVz7zW2EODV6LcKmtyALiR+RvG2yc8=";
		expect(parseEnv(`BETTER_AUTH_SECRET="${secret}"`)).toEqual({
			BETTER_AUTH_SECRET: secret,
		});
		expect(parseEnv(`BETTER_AUTH_SECRET=${secret}`)).toEqual({
			BETTER_AUTH_SECRET: secret,
		});
	});

	it("accepts an export prefix and surrounding whitespace", () => {
		expect(parseEnv("export FOO = bar")).toEqual({ FOO: "bar" });
	});

	it("reads an empty value as empty rather than skipping it", () => {
		expect(parseEnv('A=\nB=""')).toEqual({ A: "", B: "" });
	});

	it("skips lines that are not assignments", () => {
		expect(parseEnv("just some prose\n1BAD=x\nGOOD=y")).toEqual({ GOOD: "y" });
	});

	it("lets a later line win, which is how a file is edited", () => {
		expect(parseEnv("A=1\nA=2")).toEqual({ A: "2" });
	});

	it("survives CRLF, which is what a Windows editor writes", () => {
		expect(parseEnv("A=1\r\nB=2\r\n")).toEqual({ A: "1", B: "2" });
	});
});
