import { describe, expect, it } from "bun:test";
import { isBlockedAddress } from "../src/favicon";

describe("isBlockedAddress", () => {
	it("blocks loopback however it is written", () => {
		for (const ip of [
			"127.0.0.1",
			"127.1.2.3",
			"::1",
			"0:0:0:0:0:0:0:1",
			"::ffff:127.0.0.1",
			"::ffff:7f00:1",
			"::ffff:7F00:0001",
			"::7f00:1",
		])
			expect(isBlockedAddress(ip)).toBe(true);
	});

	it("blocks cloud metadata and the private ranges", () => {
		for (const ip of [
			"169.254.169.254",
			"::ffff:a9fe:a9fe",
			"10.0.0.1",
			"172.16.0.1",
			"172.31.255.255",
			"192.168.1.1",
			"100.64.0.1",
			"198.18.0.1",
			"0.0.0.0",
			"::",
			"224.0.0.1",
			"fd00::1",
			"fc00::1",
			"fe80::1",
			"fe80::1%eth0",
			"ff02::1",
		])
			expect(isBlockedAddress(ip)).toBe(true);
	});

	it("allows public addresses", () => {
		for (const ip of [
			"1.1.1.1",
			"8.8.8.8",
			"172.32.0.1",
			"192.169.0.1",
			"223.255.255.255",
			"2606:4700:4700::1111",
			"::ffff:8.8.8.8",
			"::ffff:808:808",
		])
			expect(isBlockedAddress(ip)).toBe(false);
	});

	it("blocks anything it cannot parse", () => {
		for (const ip of [
			"",
			"not-an-address",
			"1.2.3",
			"::ffff:zzzz:1",
			"1::2::3",
		])
			expect(isBlockedAddress(ip)).toBe(true);
	});
});
