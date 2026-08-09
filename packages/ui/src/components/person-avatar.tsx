"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { initialsFromName } from "@crm/ui/lib/format";
import type * as React from "react";

export type PersonAvatarSize = "sm" | "default" | "lg";

export function PersonAvatar({
	src,
	name,
	email,
	size = "default",
	...props
}: Omit<React.ComponentProps<typeof Avatar>, "children" | "size"> & {
	src?: string | null;
	name?: string | null;
	email?: string | null;
	size?: PersonAvatarSize;
}) {
	const url = src?.trim() ? src : undefined;
	const label = name?.trim() || email?.trim() || "";

	return (
		<Avatar size={size} {...props}>
			{url ? <AvatarImage src={url} alt="" /> : null}
			<AvatarFallback>{initialsFromName(label)}</AvatarFallback>
		</Avatar>
	);
}
