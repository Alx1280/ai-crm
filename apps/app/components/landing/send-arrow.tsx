import type * as React from "react";

export function SendArrow(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 16 16"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			{...props}
		>
			<path
				d="M8 13V3M3.5 7.5 8 3l4.5 4.5"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.6"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
