<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import 'mapbox-gl/dist/mapbox-gl.css';
	import type mapboxgl from 'mapbox-gl';
	import { PUBLIC_MAPBOX_TOKEN } from '$app/env/public';
	import type { DemoRoute, TruckPosition, TruckStatus } from './fakegps.ts';

	let {
		trucks,
		routes,
		selectedId = null,
		onselect
	}: {
		trucks: TruckPosition[];
		routes: DemoRoute[];
		selectedId?: string | null;
		onselect?: (id: string | null) => void;
	} = $props();

	type Mapbox = typeof mapboxgl;

	let container: HTMLDivElement;
	let mb: Mapbox;
	let map: mapboxgl.Map;
	let ready = $state(false);
	const token = PUBLIC_MAPBOX_TOKEN;
	const hasToken = !!token;
	const markers = new Map<string, { marker: mapboxgl.Marker; el: HTMLDivElement }>();

	const COLORS: Record<TruckStatus, string> = {
		moving: '#059669',
		idle: '#d97706',
		offline: '#6b7280'
	};

	// Mapbox uses [lng, lat]; our data is [lat, lng].
	const flip = (p: [number, number]): [number, number] => [p[1], p[0]];

	function buildPin(id: string) {
		const el = document.createElement('div');
		el.className = 'truck-pin';
		el.innerHTML = `
			<div class="truck-dot">
				<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 3 L19 20 L12 16 L5 20 Z" fill="#fff"/></svg>
			</div>
			<span class="truck-tag"></span>`;
		el.addEventListener('click', (e) => {
			e.stopPropagation();
			onselect?.(id);
		});
		return el;
	}

	function paintPin(el: HTMLDivElement, t: TruckPosition, selected: boolean) {
		const dot = el.querySelector<HTMLDivElement>('.truck-dot')!;
		const arrow = el.querySelector<SVGElement>('svg')!;
		const tag = el.querySelector<HTMLSpanElement>('.truck-tag')!;
		dot.style.background = COLORS[t.status];
		arrow.style.transform = `rotate(${t.heading}deg)`;
		tag.textContent = t.plateNumber + (t.totalBags > t.truckCapacity ? ' ⚠' : '');
		el.classList.toggle('is-selected', selected);
		el.classList.toggle('is-offline', t.status === 'offline');
		el.style.zIndex = selected ? '10' : '1';
	}

	onMount(() => {
		if (!hasToken) return;
		let disposed = false;

		(async () => {
			const mod = await import('mapbox-gl');
			if (disposed) return;
			mb = ((mod as any).default ?? mod) as Mapbox;
			mb.accessToken = token;

			map = new mb.Map({
				container,
				style: 'mapbox://styles/mapbox/streets-v12',
				center: [123.4741471, 8.0996951],
				zoom: 8
			});
			map.addControl(new mb.NavigationControl({ showCompass: false }), 'bottom-right');

			map.on('load', () => {
				map.addSource('routes', {
					type: 'geojson',
					data: {
						type: 'FeatureCollection',
						features: routes.map((r) => ({
							type: 'Feature',
							properties: { name: r.name },
							geometry: { type: 'LineString', coordinates: r.points.map(flip) }
						}))
					}
				});
				map.addLayer({
					id: 'routes-line',
					type: 'line',
					source: 'routes',
					paint: {
						'line-color': '#b91c1c',
						'line-width': 3,
						'line-opacity': 0.3,
						'line-dasharray': [2, 2]
					}
				});

				map.addSource('trail', {
					type: 'geojson',
					data: {
						type: 'Feature',
						properties: {},
						geometry: { type: 'LineString', coordinates: [] }
					}
				});
				map.addLayer({
					id: 'trail-line',
					type: 'line',
					source: 'trail',
					layout: { 'line-cap': 'round', 'line-join': 'round' },
					paint: { 'line-color': '#b91c1c', 'line-width': 4, 'line-opacity': 0.85 }
				});

				// const bounds = new mb.LngLatBounds();
				// routes.forEach((r) => r.points.forEach((p) => bounds.extend(flip(p))));
				// map.fitBounds(bounds, { padding: 50, animate: false });

				ready = true;
			});

			map.on('click', () => onselect?.(null));
		})();

		return () => {
			disposed = true;
			markers.forEach(({ marker }) => marker.remove());
			markers.clear();
			map?.remove();
		};
	});

	// Sync markers and the selected truck's trail with the latest positions.
	$effect(() => {
		if (!ready) return;
		const list = trucks;
		const sel = selectedId;
		const seen = new Set<string>();

		for (const t of list) {
			seen.add(t.id);
			let entry = markers.get(t.id);
			if (!entry) {
				const el = buildPin(t.id);
				const marker = new mb.Marker({ element: el, anchor: 'center' })
					.setLngLat([t.lng, t.lat])
					.addTo(map);
				entry = { marker, el };
				markers.set(t.id, entry);
			} else {
				entry.marker.setLngLat([t.lng, t.lat]);
			}
			paintPin(entry.el, t, t.id === sel);
		}
		for (const [id, { marker }] of markers) {
			if (!seen.has(id)) {
				marker.remove();
				markers.delete(id);
			}
		}

		const selected = list.find((t) => t.id === sel);
		(map.getSource('trail') as mapboxgl.GeoJSONSource).setData({
			type: 'Feature',
			properties: {},
			geometry: { type: 'LineString', coordinates: selected ? selected.trail.map(flip) : [] }
		});
	});

	// Pan to a truck only when the selection changes, not on every GPS tick.
	$effect(() => {
		if (!ready) return;
		const id = selectedId;
		if (!id) return;
		untrack(() => {
			const t = trucks.find((x) => x.id === id);
			if (t) {
				map.flyTo({
					center: [t.lng, t.lat],
					zoom: Math.max(map.getZoom(), 12),
					duration: 800
				});
			}
		});
	});

	export function fitAll() {
		if (!ready || trucks.length === 0) return;
		const bounds = new mb.LngLatBounds();
		trucks.forEach((t) => bounds.extend([t.lng, t.lat]));
		map.fitBounds(bounds, { padding: 70, maxZoom: 12 });
	}
</script>

{#if hasToken}
	<div
		bind:this={container}
		class="h-full w-full"
		role="application"
		aria-label="Live truck map"
	></div>
{:else}
	<div class="flex h-full w-full items-center justify-center bg-stone-100 p-6 text-center">
		<div class="max-w-sm">
			<p class="font-semibold text-gray-900">Mapbox token is missing</p>
			<p class="mt-1 text-sm text-gray-500">
				Add <code class="font-mono text-xs">PUBLIC_MAPBOX_TOKEN=pk...</code> to your
				<code class="font-mono text-xs">.env</code> file and restart the dev server.
			</p>
		</div>
	</div>
{/if}

<style>
	:global(.truck-pin) {
		position: relative;
		width: 30px;
		height: 30px;
		cursor: pointer;
	}
	:global(.truck-dot) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 9999px;
		border: 2px solid #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.35);
		transition: transform 0.15s;
	}
	:global(.truck-pin.is-selected .truck-dot) {
		transform: scale(1.25);
		box-shadow:
			0 0 0 4px rgb(185 28 28 / 0.35),
			0 1px 4px rgb(0 0 0 / 0.35);
	}
	:global(.truck-pin.is-offline) {
		opacity: 0.7;
	}
	:global(.truck-tag) {
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		margin-top: 3px;
		padding: 1px 6px;
		border-radius: 4px;
		background: #fff;
		color: #111827;
		font:
			600 10px/14px ui-monospace,
			monospace;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.3);
		white-space: nowrap;
	}
</style>
