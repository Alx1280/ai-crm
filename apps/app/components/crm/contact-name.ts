export function contactName(contact: {
	firstName: string;
	lastName: string | null;
}): string {
	return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}
