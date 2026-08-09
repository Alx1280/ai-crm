import * as React from "react";

// biome-ignore lint/suspicious/noConfusingVoidType: matches React's own EffectCallback signature.
export function useMountEffect(effect: () => void | (() => void)): void {
	// biome-ignore lint/correctness/useExhaustiveDependencies: running exactly once on mount is the entire purpose of this hook.
	React.useEffect(effect, []);
}
