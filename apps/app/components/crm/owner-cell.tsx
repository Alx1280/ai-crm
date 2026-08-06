import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { EmptyCellValue } from "@crm/ui/components/empty-cell";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@crm/ui/components/tooltip";
import { initialsFromName } from "@crm/ui/lib/format";

export type Owner = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

export function OwnerCell({
	owner,
	compact = false,
}: {
	owner: Owner | null;
	compact?: boolean;
}) {
	if (!owner) return compact ? null : <EmptyCellValue />;

	const avatar = (
		<Avatar size="sm">
			{owner.image ? <AvatarImage src={owner.image} alt="" /> : null}
			<AvatarFallback>{initialsFromName(owner.name)}</AvatarFallback>
		</Avatar>
	);

	if (compact) {
		return (
			<Tooltip>
				<TooltipTrigger asChild>
					<span>{avatar}</span>
				</TooltipTrigger>
				<TooltipContent>{owner.name}</TooltipContent>
			</Tooltip>
		);
	}

	return (
		<span className="flex min-w-0 items-center gap-2">
			{avatar}
			<span className="truncate">{owner.name}</span>
		</span>
	);
}
