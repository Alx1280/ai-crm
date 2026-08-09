import type * as React from "react";

const VercelLogo = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
		{...props}
	>
		<path d="m12 1.608 12 20.784H0Z" fill="currentColor" />
	</svg>
);

export default VercelLogo;
