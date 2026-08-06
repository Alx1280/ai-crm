import EveLogo from "@crm/ui/components/brand-logos/eve";
import NextjsLogo from "@crm/ui/components/brand-logos/nextjs";
import VercelLogo from "@crm/ui/components/brand-logos/vercel";

export function BuiltWith() {
	return (
		<div className="flex w-full max-w-6xl select-none flex-col items-center gap-[14px] pt-10">
			<div className="flex flex-col items-center gap-5">
				<p className="font-mono text-[13px]/4 tracking-widest text-[#6E6E6E]">
					BUILT WITH
				</p>

				<ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5 font-medium text-2xl/[30px] text-white tracking-[-0.01em]">
					<li className="flex items-center gap-3">
						<VercelLogo className="size-[26px] shrink-0" />
						Vercel
					</li>
					<li className="flex items-center gap-3">
						<NextjsLogo className="size-[26px] shrink-0" />
						Next.js
					</li>
					<li className="flex items-center gap-3">Context</li>
					<li className="flex items-center gap-3">
						<EveLogo aria-label="eve" className="h-[26px] w-[82px] shrink-0" />
					</li>
				</ul>
			</div>
		</div>
	);
}
