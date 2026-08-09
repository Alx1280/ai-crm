import Logo from "@crm/ui/components/logo";
import { cn } from "@crm/ui/lib/utils";
import Image from "next/image";
import type { MockCompany } from "./companies";

/**
 * The square a company is drawn in inside the mock. Our own record renders the
 * product mark on a light chip; everyone else renders the artwork the agent
 * mirrored for them.
 */
export function CompanyMark({
	company,
	size,
	glyph,
}: {
	company: Pick<MockCompany, "name" | "logo">;
	size: number;
	glyph: number;
}) {
	if (!company.logo) {
		return (
			<span
				className="flex shrink-0 items-center justify-center bg-foreground"
				style={{ width: size, height: size }}
			>
				<Logo
					className="shrink-0 text-background"
					style={{ width: glyph, height: glyph }}
				/>
			</span>
		);
	}

	return (
		<span
			className="flex shrink-0 items-center justify-center overflow-clip"
			style={{ width: size, height: size }}
		>
			<Image
				src={company.logo.src}
				alt=""
				width={size}
				height={size}
				className={cn(
					"size-full object-contain",
					company.logo.invert && "invert",
				)}
			/>
		</span>
	);
}
