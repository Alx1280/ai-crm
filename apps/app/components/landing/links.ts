export const REPO_URL = "https://github.com/trycompai/crm";
export const REPO_STARS = "4.4k";

export const REPO_LINKS = [
	{ label: "GitHub", href: REPO_URL },
	{ label: "Issues", href: `${REPO_URL}/issues` },
	{ label: "Pull requests", href: `${REPO_URL}/pulls` },
	{ label: "Contributing", href: `${REPO_URL}/blob/main/CONTRIBUTING.md` },
	{ label: "License", href: `${REPO_URL}/blob/main/LICENSE` },
] as const;
