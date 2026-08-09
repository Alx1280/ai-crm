export function AuthShader() {
	return (
		<>
			<div
				aria-hidden="true"
				className="absolute inset-0 size-full opacity-60 bg-[radial-gradient(circle_at_20%_20%,#2e2e2e,transparent_55%),radial-gradient(circle_at_80%_0%,#1a1a1a,transparent_50%),radial-gradient(circle_at_60%_90%,#ededed_0%,transparent_40%),linear-gradient(#000000,#000000)]"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 opacity-[0.5] mix-blend-overlay bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]"
			/>
			<div aria-hidden="true" className="absolute inset-0 bg-background/70" />
		</>
	);
}
