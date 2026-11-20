<script lang="ts">
	import BudgetPlacement from '#lib/components/placement-generator/budget-placement.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Med Guide CCS | Puting Manok Corporation</title>
</svelte:head>

<BudgetPlacement {data} />
