import { redirect } from "next/navigation";
import { recordHref } from "@/lib/record-href";

export const instant = false;

export default async function RecordRedirect({
	params,
}: {
	params: Promise<{ slug: string; contactId: string }>;
}) {
	const { slug, contactId } = await params;
	redirect(recordHref(slug, "/contacts", "contact", contactId));
}
