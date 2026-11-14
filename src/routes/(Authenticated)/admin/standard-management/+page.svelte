<script lang="ts">
	import Agemedicine from '#lib/components/admin/dialogs/standards/agemedicine.svelte';
	import Area from '#lib/components/admin/dialogs/standards/area.svelte';
	import Cost from '#lib/components/admin/dialogs/standards/cost.svelte';
	import Manpower from '#lib/components/admin/dialogs/standards/manpower.svelte';
	import Medicines from '#lib/components/admin/dialogs/standards/medicines.svelte';
	import Medsvac from '#lib/components/admin/dialogs/standards/medsvac.svelte';
	import Standardsummary from '#lib/components/admin/dialogs/standards/standardsummary.svelte';
	import Supplies from '#lib/components/admin/dialogs/standards/supplies.svelte';
	import * as Tabs from '#lib/components/ui/tabs/index.js';
	import {
		CoinsIcon,
		UsersIcon,
		BoxesIcon,
		SyringeIcon,
		PillBottle,
		LandPlot,
		Pill,
		Tablets
	} from '@lucide/svelte';

	let { data } = $props();

	const tabs = [
		{
			value: 'costitems',
			label: 'Cost Items',
			icon: CoinsIcon,
			description: 'Standard costs applied across production.'
		},
		{
			value: 'manpower',
			label: 'Manpower',
			icon: UsersIcon,
			description: 'Standard labor requirements and rates.'
		},
		{
			value: 'supplies',
			label: 'Supplies',
			icon: BoxesIcon,
			description: 'Standard supply usage per farm type.'
		},
		{
			value: 'medsvac',
			label: 'Meds & VAC',
			icon: SyringeIcon,
			description: 'Standard medicine and vaccine quantities per 1,000.'
		},
		{
			value: 'area',
			label: 'Area',
			icon: LandPlot,
			description: 'Standard areas.'
		},
		{
			value: 'medicines',
			label: 'Medicine',
			icon: Pill,
			description: 'Standard medicine quantity.'
		},
		{
			value: 'medage',
			label: 'Medication by Age',
			icon: Tablets,
			description: 'Standard medicine by age configuration.'
		}
	] as const;

	let activeTab = $state<(typeof tabs)[number]['value']>('costitems');
	const active = $derived(tabs.find((t) => t.value === activeTab) ?? tabs[0]);
</script>

<svelte:head>
	<title>Standards Management | Puting Manok Corporation</title>
</svelte:head>

<div class="h-full w-full overflow-y-auto rounded-tl-4xl bg-stone-50 p-6 sm:p-8">
	<div class="mx-auto max-w-7xl space-y-6">
		<!-- HEADER -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p class="text-xs font-semibold tracking-wider text-red-700 uppercase">System Overview</p>
				<h1 class="mt-1 text-3xl font-bold tracking-tight text-gray-900">Standards Management</h1>
				<p class="mt-1 text-sm text-gray-500">
					Manage standards across all variables in the system.
				</p>
			</div>
		</div>

		<!-- SUMMARY -->
		<Standardsummary summaries={data.summaries} onselect={(key) => (activeTab = key)} />

		<Tabs.Root bind:value={activeTab} class="flex w-full flex-col gap-0">
			<!-- Tab bar -->
			<div class="overflow-hidden border-b border-gray-200">
				<Tabs.List
					class="h-auto w-max min-w-full justify-start gap-1 rounded-none bg-transparent p-0"
				>
					{#each tabs as tab (tab.value)}
						<Tabs.Trigger
							value={tab.value}
							class="-mb-px flex-none gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-3 text-sm font-medium whitespace-nowrap text-gray-500 shadow-none transition-colors hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-red-500/40 data-[state=active]:border-red-700 data-[state=active]:bg-transparent data-[state=active]:text-red-700 data-[state=active]:shadow-none"
						>
							<tab.icon class="h-4 w-4" />
							{tab.label}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>
			</div>

			<!-- Active tab description -->
			<p class="mt-4 text-sm text-gray-500" aria-live="polite">{active.description}</p>

			<!-- Panels -->
			<Tabs.Content value="costitems" class="mt-4 focus-visible:outline-none"><Cost /></Tabs.Content
			>
			<Tabs.Content value="manpower" class="mt-4 focus-visible:outline-none"
				><Manpower /></Tabs.Content
			>
			<Tabs.Content value="supplies" class="mt-4 focus-visible:outline-none"
				><Supplies /></Tabs.Content
			>
			<Tabs.Content value="medsvac" class="mt-4 focus-visible:outline-none"
				><Medsvac /></Tabs.Content
			>
			<Tabs.Content value="area" class="mt-4 focus-visible:outline-none"><Area /></Tabs.Content>
			<Tabs.Content value="medicines" class="mt-4 focus-visible:outline-none"
				><Medicines /></Tabs.Content
			>
			<Tabs.Content value="medage" class="mt-4 focus-visible:outline-none"
				><Agemedicine /></Tabs.Content
			>
		</Tabs.Root>
	</div>
</div>
