export type MockCompany = {
	name: string;
	domain: string;
	logo?: { src: string; invert?: boolean };
	industry?: string;
	owner?: { name: string; avatar: string };
	contacts?: string;
	deals?: string;
	lastActivity?: string;
};

export const OWNER = {
	name: "Patrick Onusko",
	avatar: "/landing/avatar-patrick.jpg",
};

export const MOCK_COMPANIES: MockCompany[] = [
	{
		name: "Comp AI",
		domain: "trycomp.ai",
		industry: "Retail & E-commerce",
		owner: OWNER,
		contacts: "1",
		deals: "0",
		lastActivity: "2h ago",
	},
	{
		name: "Tristar Fulfillment",
		domain: "tristarfulfillment.com",
		logo: { src: "/landing/logos/tristar-fulfillment.webp", invert: true },
	},
	{
		name: "AuditBot",
		domain: "auditbot.co",
		logo: { src: "/landing/logos/auditbot.webp" },
	},
	{
		name: "Tawkeed",
		domain: "tawkeed.ai",
		logo: { src: "/landing/logos/tawkeed.webp" },
	},
	{
		name: "Piku",
		domain: "piku.com",
		logo: { src: "/landing/logos/piku.webp" },
	},
	{
		name: "Roo Capital",
		domain: "roocapital.com",
		logo: { src: "/landing/logos/roo-capital.webp" },
	},
	{
		name: "Social Good Software",
		domain: "socialgoodsoftware.com",
		logo: { src: "/landing/logos/social-good-software.webp" },
	},
	{
		name: "Ridgetop",
		domain: "ridgetoptech.com",
		logo: { src: "/landing/logos/ridgetop.webp" },
	},
];

export const COMPANY_COLUMNS = [
	{ label: "Company", width: "26%" },
	{ label: "Domain", width: "16%" },
	{ label: "Industry", width: "16%" },
	{ label: "Owner", width: "16%" },
	{ label: "Contacts", width: "9%" },
	{ label: "Deals", width: "9%" },
	{ label: "Last activity", width: "12%" },
] as const;
