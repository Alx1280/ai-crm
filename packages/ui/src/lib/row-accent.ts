const BAR = [
	"[&>td:first-child]:relative",
	"[&>td:first-child]:before:pointer-events-none [&>td:first-child]:before:absolute",
	"[&>td:first-child]:before:inset-y-0 [&>td:first-child]:before:left-0 [&>td:first-child]:before:w-0.5",
	"[&>td:first-child]:before:bg-foreground [&>td:first-child]:before:opacity-0",
	"[&:hover>td:first-child]:before:opacity-100",
].join(" ");

export const ROW_ACCENT = [
	"cursor-pointer",
	BAR,
	"[&>td:first-child]:transition-[padding] [&>td:first-child]:duration-200 [&>td:first-child]:ease-out",
	"[&:hover>td:first-child]:pl-5",
].join(" ");

export const ROW_ACCENT_EXPANDABLE = [
	"cursor-pointer",
	BAR,
	"[&>td:nth-child(2)]:transition-[padding] [&>td:nth-child(2)]:duration-200 [&>td:nth-child(2)]:ease-out",
	"[&:hover>td:nth-child(2)]:pl-5",
].join(" ");
