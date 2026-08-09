import GitHubLogo from "@crm/ui/components/brand-logos/github";
import { Button } from "@crm/ui/components/button";
import { REPO_STARS, REPO_URL } from "./links";

export function GitHubStarButton() {
	return (
		<Button variant="outline-ghost" size="xl" asChild>
			<a href={REPO_URL} target="_blank" rel="noreferrer">
				<GitHubLogo data-icon="inline-start" className="size-[15px]" />
				Star on GitHub
				<span aria-hidden="true" className="h-4 w-px shrink-0 bg-border" />
				<span
					data-icon="inline-end"
					className="flex items-center gap-[5px] font-mono font-normal text-[13px] text-muted-foreground"
				>
					<StarIcon className="size-[13px] shrink-0 text-[#E3B341]" />
					{REPO_STARS}
				</span>
			</a>
		</Button>
	);
}

function StarIcon(props: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			viewBox="0 0 16 16"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			{...props}
		>
			<path
				d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
				fill="currentColor"
			/>
		</svg>
	);
}
