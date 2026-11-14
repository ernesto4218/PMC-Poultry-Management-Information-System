<!-- #lib/components/admin/standards-summary.svelte -->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.js';
	import type { StandardKey, StandardSummary } from '#lib/types/standards/supplies/summary.ts';
	import {
		CoinsIcon,
		UsersIcon,
		BoxesIcon,
		SyringeIcon,
		ArchiveIcon,
		ClockIcon,
		ArrowUpRightIcon
	} from '@lucide/svelte';

	let {
		summaries = [],
		onselect
	}: {
		summaries?: StandardSummary[];
		onselect?: (key: StandardKey) => void;
	} = $props();

	const meta = {
		costitems: { label: 'Cost Items', icon: CoinsIcon, tone: 'bg-amber-50 text-amber-700' },
		manpower: { label: 'Manpower', icon: UsersIcon, tone: 'bg-sky-50 text-sky-700' },
		supplies: { label: 'Supplies', icon: BoxesIcon, tone: 'bg-emerald-50 text-emerald-700' },
		medsvac: { label: 'Meds & VAC', icon: SyringeIcon, tone: 'bg-rose-50 text-rose-700' }
	} as const;

	const totalActive = $derived(summaries.reduce((n, s) => n + s.active, 0));
	const totalArchived = $derived(summaries.reduce((n, s) => n + s.archived, 0));

	const dateFmt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
	const formatDate = (iso: string | null) => (iso ? dateFmt.format(new Date(iso)) : '—');
</script>

<section class="space-y-3" aria-label="Standards summary">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<span class="font-semibold text-gray-900">{totalActive}</span> active standards
		<span aria-hidden="true">·</span>
		<span class="inline-flex items-center gap-1">
			<ArchiveIcon class="h-3.5 w-3.5" />
			{totalArchived} archived
		</span>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		{#each summaries as s (s.key)}
			{@const m = meta[s.key]}
			<button
				type="button"
				onclick={() => onselect?.(s.key)}
				class="group text-left focus-visible:outline-none"
			>
				<Card.Root
					class="h-full gap-3 py-4 transition-shadow group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-red-500/40"
				>
					<Card.Header class="flex flex-row items-center justify-between space-y-0 px-4">
						<div class="flex items-center gap-2">
							<span class="rounded-md p-2 {m.tone}">
								<m.icon class="h-4 w-4" />
							</span>
							<Card.Title class="text-sm font-semibold text-gray-900">{m.label}</Card.Title>
						</div>
						<ArrowUpRightIcon
							class="h-4 w-4 text-gray-300 transition-colors group-hover:text-red-700"
						/>
					</Card.Header>

					<Card.Content class="space-y-3 px-4">
						<div>
							<p class="text-3xl font-bold tracking-tight text-gray-900">{s.active}</p>
							<p class="text-xs text-gray-500">active items</p>
						</div>

						<div class="rounded-md bg-stone-50 px-3 py-2">
							<p class="text-[11px] font-medium tracking-wide text-gray-500 uppercase">
								{s.highlightLabel}
							</p>
							<p class="text-sm font-semibold text-gray-900">{s.highlightValue}</p>
						</div>
					</Card.Content>

					<Card.Footer class="flex items-center justify-between px-4 text-xs text-gray-500">
						<span class="inline-flex items-center gap-1">
							<ClockIcon class="h-3.5 w-3.5" />
							{formatDate(s.lastUpdated)}
						</span>
						{#if s.archived > 0}
							<span
								class="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-gray-600"
							>
								<ArchiveIcon class="h-3 w-3" />
								{s.archived}
							</span>
						{/if}
					</Card.Footer>
				</Card.Root>
			</button>
		{/each}
	</div>
</section>
