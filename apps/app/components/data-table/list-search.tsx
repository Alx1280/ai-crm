"use client";

import Search from "@carbon/icons-react/es/Search";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@crm/ui/components/input-group";
import { useSearchInput } from "@crm/ui/hooks/use-search-input";
import { useQueryStates } from "nuqs";
import { searchParsers } from "./list-search-params";

export function ListSearch({ placeholder }: { placeholder: string }) {
	const [{ q }, setState] = useQueryStates(searchParsers);

	const [value, setValue] = useSearchInput(q, (next) =>
		setState({ q: next, page: 1 }),
	);

	return (
		<InputGroup className="w-full sm:w-64">
			<InputGroupAddon>
				<Search />
			</InputGroupAddon>
			<InputGroupInput
				placeholder={placeholder}
				value={value}
				onChange={(event) => setValue(event.target.value)}
				autoComplete="off"
			/>
		</InputGroup>
	);
}
