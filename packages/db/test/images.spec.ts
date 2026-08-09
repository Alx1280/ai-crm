import { describe, expect, it } from "bun:test";
import { COMPANY_IMAGE_FIELDS, isMirrored, isOptimizable } from "../src/images";

const OURS = "https://abc123.public.blob.vercel-storage.com";

describe("isMirrored", () => {
	it("recognises our own store, so a re-run does not re-upload", () => {
		expect(isMirrored(`${OURS}/contacts/c1-9f8e.jpg`)).toBe(true);
	});

	it("does not recognise somebody else's CDN", () => {
		expect(isMirrored("https://media.licdn.com/dms/image/x.jpg")).toBe(false);
		expect(isMirrored("https://lh3.googleusercontent.com/a/x=s96-c")).toBe(
			false,
		);
	});

	it("is not fooled by a lookalike host", () => {
		expect(
			isMirrored("https://evil.com/public.blob.vercel-storage.com/x.jpg"),
		).toBe(false);
		expect(isMirrored("https://blob.vercel-storage.com.evil.com/x.jpg")).toBe(
			false,
		);
	});

	it("treats nothing and nonsense as not ours", () => {
		expect(isMirrored(null)).toBe(false);
		expect(isMirrored("")).toBe(false);
		expect(isMirrored("not a url")).toBe(false);
	});
});

describe("isOptimizable", () => {
	it("passes a raster we minted", () => {
		for (const extension of ["jpg", "jpeg", "png", "webp", "avif", "gif"]) {
			expect(isOptimizable(`${OURS}/companies/c1/icon-9f8e.${extension}`)).toBe(
				true,
			);
		}
	});

	it("refuses an SVG even though it is ours", () => {
		expect(isOptimizable(`${OURS}/companies/c1/logoUrl-9f8e.svg`)).toBe(false);
	});

	it("refuses an ico, which the optimizer cannot serve", () => {
		expect(isOptimizable(`${OURS}/companies/c1/icon-9f8e.ico`)).toBe(false);
	});

	it("refuses anything we did not mint, whatever its extension", () => {
		expect(isOptimizable("https://cdn.context.dev/logo.png")).toBe(false);
		expect(isOptimizable("https://lh3.googleusercontent.com/a/x.jpg")).toBe(
			false,
		);
	});

	it("refuses a URL with no extension to read", () => {
		expect(isOptimizable(`${OURS}/companies/c1/icon`)).toBe(false);
		expect(isOptimizable(null)).toBe(false);
	});
});

describe("COMPANY_IMAGE_FIELDS", () => {
	it("names every artwork column and nothing else", () => {
		expect([...COMPANY_IMAGE_FIELDS]).toEqual([
			"logoUrl",
			"logoDarkUrl",
			"iconUrl",
			"iconDarkUrl",
		]);
	});
});
