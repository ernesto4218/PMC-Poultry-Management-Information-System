<script lang="ts">
	// @ts-nocheck
	import Bird from '@lucide/svelte/icons/bird';
	import CalendarPlus from '@lucide/svelte/icons/calendar-plus';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import MapIcon from '@lucide/svelte/icons/map';
	import { formatNumber, formatDateShort, toTitle } from '#lib/utils/format.ts';
	import InfoItem from './info-item.svelte';
	import TypeBadge from './type-badge.svelte';

	let { batch, farm }: { batch: any; farm: any } = $props();
</script>

<section
	aria-labelledby="batch-details-title"
	class="overflow-hidden rounded-lg border border-red-100 bg-white shadow-sm"
>
	<div
		class="flex items-center justify-between gap-2 border-b border-red-100 bg-gradient-to-r from-red-50 to-amber-50 px-3 py-2"
	>
		<div class="flex min-w-0 items-baseline gap-2">
			<h2 id="batch-details-title" class="truncate font-mono text-sm font-bold text-gray-900">
				{batch.batchNumber}
			</h2>

			<span class="truncate text-sm font-semibold text-gray-700">
				{farm.name}
			</span>

			<span class="font-mono text-xs font-semibold text-red-700">
				{farm.code}
			</span>

			<TypeBadge type={farm.type} />
		</div>
	</div>

	<dl class="grid grid-cols-2 gap-x-6 gap-y-2 px-3 py-2.5 sm:grid-cols-3 lg:grid-cols-4">
		<InfoItem icon={Bird} label="Batch volume" value={`${formatNumber(batch.volume)} chicks`} />
		<InfoItem icon={CalendarPlus} label="Date set" value={formatDateShort(batch.dateSet)} />
		<InfoItem icon={MapPin} label="Farm" value={`${farm.name} (${farm.code})`} />
		<InfoItem icon={MapIcon} label="Address" value={toTitle(farm.address)} />
	</dl>

	<p class="truncate border-t border-amber-100 px-3 py-1 font-mono text-[10px] text-gray-400">
		Batch ID: {batch.id} · Farm ID: {farm.id}
	</p>
</section>
