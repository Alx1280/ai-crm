import { describe, expect, it } from "bun:test";

import {
	looksLikeSameCompany,
	nameMatchesLocalPart,
	searchTerms,
} from "../agent/lib/names";

describe("searchTerms", () => {
	it("strips the initial off a run-together handle", () => {
		expect(searchTerms("pmarchetti")).toContain("marchetti");
		expect(searchTerms("tokonkwo")).toContain("okonkwo");
	});

	it("trusts an explicit separator over any guess", () => {
		const terms = searchTerms("jane.doe");
		expect(terms[0]).toBe("jane doe");
		expect(terms).toContain("doe");
	});

	it("tries the whole handle before decomposing it", () => {
		expect(searchTerms("nathan").indexOf("nathan")).toBe(0);
	});

	it("never emits a fragment too short to search usefully", () => {
		expect(searchTerms("abc").every((term) => term.length >= 3)).toBe(true);
		expect(searchTerms("jo")).toEqual([]);
	});
});

describe("looksLikeSameCompany", () => {
	it("matches an employer to the shorter name the CRM holds", () => {
		expect(
			looksLikeSameCompany("Northwind Bank", "Northwind", "northwind.com"),
		).toBe(true);
		expect(looksLikeSameCompany("Fernhill", "Fernhill", "fernhill.com")).toBe(
			true,
		);
	});

	it("rejects an unrelated employer", () => {
		expect(
			looksLikeSameCompany("Brightwater Group", "Fernhill", "fernhill.com"),
		).toBe(false);
		expect(looksLikeSameCompany("", "Fernhill", "fernhill.com")).toBe(false);
	});
});

describe("nameMatchesLocalPart", () => {
	const person = (firstName: string, lastName: string) => ({
		firstName,
		lastName,
	});

	it("accepts the initial-plus-surname form", () => {
		expect(
			nameMatchesLocalPart(person("Paula", "Marchetti"), "pmarchetti"),
		).toBe(true);
		expect(nameMatchesLocalPart(person("Tomi", "Okonkwo"), "tokonkwo")).toBe(
			true,
		);
	});

	it("accepts first-name-only and run-together forms", () => {
		expect(nameMatchesLocalPart(person("Nathan", "Owen"), "nathan")).toBe(true);
		expect(nameMatchesLocalPart(person("Jane", "Doe"), "janedoe")).toBe(true);
	});

	it("rejects a stranger who merely turned up in the results", () => {
		expect(
			nameMatchesLocalPart(person("Antonio", "Fontana"), "pmarchetti"),
		).toBe(false);
		expect(nameMatchesLocalPart(person("Preeti", "Duarte"), "tokonkwo")).toBe(
			false,
		);
	});

	it("rejects when the profile carries no name at all", () => {
		expect(
			nameMatchesLocalPart({ firstName: null, lastName: null }, "pmarchetti"),
		).toBe(false);
	});
});
