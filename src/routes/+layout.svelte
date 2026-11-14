<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';
	import { Toaster } from 'svelte-sonner';

	let { children }: LayoutProps = $props();
</script>

<Toaster position="top-center" richColors />
<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
