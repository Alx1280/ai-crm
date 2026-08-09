"use client";

import { Spinner } from "@crm/ui/components/spinner";
import dynamic from "next/dynamic";

const load = () => import("@crm/ui/components/dashboard-chart");

const loading = () => (
	<div className="flex h-[200px] items-center justify-center">
		<Spinner />
	</div>
);

export const AreaTrend = dynamic(() => load().then((m) => m.AreaTrend), {
	ssr: false,
	loading,
});

export const DonutStat = dynamic(() => load().then((m) => m.DonutStat), {
	ssr: false,
	loading,
});
