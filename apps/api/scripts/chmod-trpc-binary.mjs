import { chmodSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse } from "node:path";

const require = createRequire(import.meta.url);

const NATIVE_TARGETS = [
	"aarch64-apple-darwin",
	"x86_64-apple-darwin",
	"aarch64-unknown-linux-gnu",
	"x86_64-unknown-linux-gnu",
];

function packageRoot() {
	let dir;
	try {
		dir = dirname(require.resolve("nestjs-trpc"));
	} catch {
		return undefined;
	}

	const { root } = parse(dir);
	while (dir !== root) {
		if (existsSync(join(dir, "native"))) return dir;
		dir = dirname(dir);
	}
	return undefined;
}

const root = packageRoot();

if (root) {
	for (const target of NATIVE_TARGETS) {
		const binary = join(root, "native", target, "nestjs-trpc");
		if (!existsSync(binary)) continue;
		try {
			chmodSync(binary, 0o755);
		} catch {}
	}
}
