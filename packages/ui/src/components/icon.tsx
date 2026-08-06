import { cn } from "@crm/ui/lib/utils";
import type * as React from "react";

export const ICON_MOTIONS = [
	"pop",
	"scale",
	"lift",
	"turn",
	"rotate",
	"flip",
	"spin",
	"wiggle",
	"swing",
	"bounce",
	"pulse",
	"nudge-right",
	"nudge-left",
	"nudge-up",
	"nudge-down",
	"launch",
	"none",
] as const;

export type IconMotion = (typeof ICON_MOTIONS)[number];

export type CarbonIconProps = React.SVGProps<SVGSVGElement> & {
	size?: number | string;
};

export type CarbonIcon = React.ComponentType<CarbonIconProps> & {
	displayName?: string;
	render?: { displayName?: string; name?: string };
};

const MOTION_BY_ICON: Record<string, IconMotion> = {
	ArrowRight: "nudge-right",
	ChevronRight: "nudge-right",
	Play: "nudge-right",
	SendAlt: "nudge-right",
	Logout: "nudge-right",
	ArrowLeft: "nudge-left",
	ChevronLeft: "nudge-left",
	ArrowUp: "nudge-up",
	ArrowDown: "nudge-down",
	ChevronDown: "nudge-down",
	Download: "bounce",
	Launch: "launch",
	Settings: "spin",
	Renew: "spin",
	Restart: "spin",
	RecentlyViewed: "spin",
	Earth: "spin",
	Add: "turn",
	Close: "turn",
	TrashCan: "wiggle",
	Tools: "wiggle",
	Locked: "wiggle",
	Password: "wiggle",
	MagicWand: "wiggle",
	Search: "wiggle",
	WarningAlt: "wiggle",
	Misuse: "pulse",
	Information: "pulse",
	Security: "pulse",
	Light: "pulse",
	Ai: "pulse",
	Chip: "pulse",
	Asleep: "swing",
};

function iconName(icon: CarbonIcon): string | undefined {
	return icon.displayName ?? icon.render?.displayName ?? icon.render?.name;
}

export function iconMotionFor(icon: CarbonIcon): IconMotion {
	const name = iconName(icon);
	return (name && MOTION_BY_ICON[name]) || "pop";
}

export type IconProps = CarbonIconProps & {
	icon: CarbonIcon;
	motion?: IconMotion;
};

export function Icon({ icon: Glyph, motion, className, ...props }: IconProps) {
	const resolved = motion ?? iconMotionFor(Glyph);
	return (
		<Glyph
			aria-hidden
			focusable={false}
			{...props}
			data-motion={resolved}
			className={cn("cds-icon", className)}
		/>
	);
}
