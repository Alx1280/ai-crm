"use client";

import { useEffect, useRef, useState } from "react";

export function useSearchInput(
	committed: string,
	commit: (value: string) => void,
	delayMs = 250,
) {
	const [value, setValue] = useState(committed);

	const commitRef = useRef(commit);
	commitRef.current = commit;

	const committedRef = useRef(committed);
	committedRef.current = committed;

	useEffect(() => {
		setValue(committed);
	}, [committed]);

	useEffect(() => {
		if (value === committedRef.current) return;
		const timer = setTimeout(() => commitRef.current(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return [value, setValue] as const;
}
