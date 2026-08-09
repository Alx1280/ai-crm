export type Bloom = "off" | "low" | "high" | "aura";

const BLOOM_CLASS: Record<Bloom, string> = {
	off: "",
	low: "bloom-low",
	high: "bloom-high",
	aura: "bloom-aura",
};

export function bloomClass(bloom: Bloom = "off"): string {
	return BLOOM_CLASS[bloom];
}
