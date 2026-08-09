import { beforeAll, describe, expect, it } from "bun:test";
import { verifyJwtHmac } from "eve/channels/auth";

const SECRET = "test-secret-at-least-long-enough-to-be-a-secret";

const CONFIG = {
	algorithm: "HS256",
	audiences: ["crm-agent"],
	issuer: "crm-app",
	secret: SECRET,
} as const;

let mintBridgeToken: typeof import("../lib/agent-bridge").mintBridgeToken;

beforeAll(async () => {
	process.env.AGENT_BRIDGE_SECRET = SECRET;
	({ mintBridgeToken } = await import("../lib/agent-bridge"));
});

const rep = {
	id: "user_123",
	email: "lewis@trycomp.ai",
	name: "Lewis Carhart",
};

describe("mintBridgeToken", () => {
	it("mints a token eve accepts", async () => {
		const token = await mintBridgeToken(rep);
		const result = await verifyJwtHmac(token, CONFIG);

		expect(result.ok).toBe(true);
	});

	it("names the rep, so the agent knows a person is driving", async () => {
		const token = await mintBridgeToken(rep);
		const result = await verifyJwtHmac(token, CONFIG);

		expect(result.ok && result.sessionAuth.subject).toBe(rep.id);
		expect(result.ok && result.sessionAuth.attributes?.email).toBe(rep.email);
	});

	it("is rejected by a different secret", async () => {
		const token = await mintBridgeToken(rep);
		const result = await verifyJwtHmac(token, {
			...CONFIG,
			secret: "a-different-secret-entirely",
		});

		expect(result.ok).toBe(false);
	});

	it("is rejected by an agent expecting another audience", async () => {
		const token = await mintBridgeToken(rep);
		const result = await verifyJwtHmac(token, {
			...CONFIG,
			audiences: ["someone-elses-agent"],
		});

		expect(result.ok).toBe(false);
	});

	it("expires, so a token left in a tab stops working", async () => {
		const token = await mintBridgeToken(rep);
		const [, payload] = token.split(".");
		const claims = JSON.parse(
			Buffer.from(payload as string, "base64url").toString(),
		) as { exp: number; iat: number };

		const lifetime = claims.exp - claims.iat;
		expect(lifetime).toBeLessThanOrEqual(300);
		expect(lifetime).toBeGreaterThan(30);
	});

	it("refuses to mint without a secret", async () => {
		const secret = process.env.AGENT_BRIDGE_SECRET;
		process.env.AGENT_BRIDGE_SECRET = "";

		expect(mintBridgeToken(rep)).rejects.toThrow();

		process.env.AGENT_BRIDGE_SECRET = secret;
	});
});
