export function SectionHeading({
	title,
	lede,
}: {
	title: string;
	lede?: string;
}) {
	return (
		<div className="flex max-w-3xl flex-col gap-[18px]">
			<h2 className="text-balance font-semibold text-4xl/[42px] tracking-tight md:text-[44px]/[50px]">
				{title}
			</h2>
			{lede ? (
				<p className="text-muted-foreground text-lg/[29px]">{lede}</p>
			) : null}
		</div>
	);
}
