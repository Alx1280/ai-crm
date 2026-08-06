import type * as React from "react";
import { ViewTransition } from "react";

const directional = {
	"nav-forward": "nav-forward",
	"nav-back": "nav-back",
	"nav-lateral": "nav-lateral",
	default: "none",
} as const;

const enter = {
	"nav-forward": "nav-forward",
	"nav-back": "nav-back",
	"nav-lateral": "nav-lateral",
	default: "none",
} as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
	return (
		<ViewTransition
			enter={enter}
			exit={directional}
			update={directional}
			default="none"
		>
			{children}
		</ViewTransition>
	);
}
