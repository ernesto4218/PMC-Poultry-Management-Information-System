// Fake GPS feed for the live truck map.
// Swap `createSimulator` for a real source (WebSocket / SSE / polling endpoint)
// later: the UI only needs a list of `TruckPosition` objects.

export type LatLng = [number, number];
export type TruckStatus = 'moving' | 'idle' | 'offline';

export type DemoRoute = { name: string; points: LatLng[] };

export type TruckSeed = {
	id: string;
	tripCode: string;
	plateNumber: string;
	driverName: string;
	driverPhone: string | null;
	totalBags: number;
	truckCapacity: number;
};

export type TruckPosition = TruckSeed & {
	lat: number;
	lng: number;
	heading: number; // degrees, 0 = north
	speedKph: number;
	status: TruckStatus;
	routeName: string;
	progress: number; // 0..100 along the current route
	updatedAt: number; // ms epoch
	trail: LatLng[];
};

// Demo routes are built around this point as [lat, lng]. Change it to move the whole demo.
const CENTER: LatLng = [8.0996951, 123.4741471];

// Offset from CENTER in km: x = east, y = north.
const at = (x: number, y: number): LatLng => [CENTER[0] + y / 111, CENTER[1] + x / 110];

export const DEMO_ROUTES: DemoRoute[] = [
	{
		name: 'North route',
		points: [at(0, 0), at(2, 6), at(1, 12), at(4, 18), at(3, 25)]
	},
	{
		name: 'East route',
		points: [at(0, 0), at(8, 1), at(14, -2), at(22, 2), at(28, 0)]
	},
	{
		name: 'South route',
		points: [at(0, 0), at(-2, -7), at(1, -13), at(-1, -20)]
	},
	{
		name: 'West route',
		points: [at(0, 0), at(-7, 2), at(-13, 0), at(-20, 3)]
	},
	{
		name: 'Southeast loop',
		points: [at(-8, -6), at(-3, -10), at(6, -8), at(10, -3), at(9, 5)]
	}
];

export const DEMO_SEEDS: TruckSeed[] = [
	['DEMO-01', 'ABC 1234', 'Juan Dela Cruz', 520, 560],
	['DEMO-02', 'XYZ 5678', 'Pedro Santos', 560, 560],
	['DEMO-03', 'NBA 4421', 'Ramon Reyes', 610, 560],
	['DEMO-04', 'GHT 9087', 'Mario Bautista', 300, 560],
	['DEMO-05', 'KLM 3310', 'Jose Garcia', 480, 560],
	['DEMO-06', 'PQR 7742', 'Eduardo Cruz', 555, 560]
].map(([tripCode, plateNumber, driverName, totalBags, truckCapacity]) => ({
	id: tripCode as string,
	tripCode: tripCode as string,
	plateNumber: plateNumber as string,
	driverName: driverName as string,
	driverPhone: null,
	totalBags: totalBags as number,
	truckCapacity: truckCapacity as number
}));

// ---- geometry ---------------------------------------------------------
const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

function haversine(a: LatLng, b: LatLng): number {
	const dLat = rad(b[0] - a[0]);
	const dLng = rad(b[1] - a[1]);
	const h =
		Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(h));
}

function bearing(a: LatLng, b: LatLng): number {
	const y = Math.sin(rad(b[1] - a[1])) * Math.cos(rad(b[0]));
	const x =
		Math.cos(rad(a[0])) * Math.sin(rad(b[0])) -
		Math.sin(rad(a[0])) * Math.cos(rad(b[0])) * Math.cos(rad(b[1] - a[1]));
	return (deg(Math.atan2(y, x)) + 360) % 360;
}

type PreparedRoute = DemoRoute & { cum: number[]; length: number };

function prepare(route: DemoRoute): PreparedRoute {
	const cum = [0];
	for (let i = 1; i < route.points.length; i++) {
		cum.push(cum[i - 1] + haversine(route.points[i - 1], route.points[i]));
	}
	return { ...route, cum, length: cum[cum.length - 1] };
}

function pointAt(route: PreparedRoute, dist: number): LatLng {
	const d = Math.max(0, Math.min(dist, route.length));
	let i = 1;
	while (i < route.cum.length - 1 && route.cum[i] < d) i++;
	const segLen = route.cum[i] - route.cum[i - 1] || 1;
	const t = (d - route.cum[i - 1]) / segLen;
	const [a, b] = [route.points[i - 1], route.points[i]];
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ---- simulator ----------------------------------------------------------
type Internal = {
	seed: TruckSeed;
	route: PreparedRoute;
	dist: number;
	dir: 1 | -1;
	status: TruckStatus;
	hold: number; // ticks left in idle/offline
	speedKph: number;
	heading: number;
	trail: LatLng[];
	lastSeen: number;
};

const TRAIL_LENGTH = 40;
/** Makes trucks cover ground fast enough to watch. 1 = real speed. */
const TIME_SCALE = 25;

export function createSimulator(seeds: TruckSeed[], routes: DemoRoute[] = DEMO_ROUTES) {
	const prepared = routes.map(prepare);
	const trucks: Internal[] = seeds.map((seed, i) => {
		const route = prepared[i % prepared.length];
		const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
		const dist = route.length * (0.1 + Math.random() * 0.8);
		const p = pointAt(route, dist);
		return {
			seed,
			route,
			dist,
			dir,
			status: 'moving',
			hold: 0,
			speedKph: 40 + Math.random() * 25,
			heading: 0,
			trail: [p],
			lastSeen: Date.now()
		};
	});

	function tick(dtSeconds = 1) {
		const now = Date.now();
		for (const t of trucks) {
			if (t.status === 'moving') {
				t.speedKph = Math.max(20, Math.min(75, t.speedKph + (Math.random() - 0.5) * 8));
				t.dist += (t.speedKph / 3.6) * dtSeconds * TIME_SCALE * t.dir;

				if (t.dist >= t.route.length) {
					t.dist = t.route.length;
					t.dir = -1;
					t.status = 'idle';
					t.hold = 6 + Math.floor(Math.random() * 6); // unloading at destination
				} else if (t.dist <= 0) {
					t.dist = 0;
					t.dir = 1;
					t.status = 'idle';
					t.hold = 6 + Math.floor(Math.random() * 6);
				} else if (Math.random() < 0.012) {
					t.status = 'idle';
					t.hold = 4 + Math.floor(Math.random() * 6);
				} else if (Math.random() < 0.003) {
					t.status = 'offline';
					t.hold = 8 + Math.floor(Math.random() * 8);
				}
			} else {
				t.hold -= 1;
				if (t.hold <= 0) t.status = 'moving';
			}

			const here = pointAt(t.route, t.dist);
			const ahead = pointAt(t.route, t.dist + t.dir * 25);
			if (t.status === 'moving') t.heading = bearing(here, ahead);

			if (t.status !== 'offline') {
				t.lastSeen = now;
				const last = t.trail[t.trail.length - 1];
				if (!last || last[0] !== here[0] || last[1] !== here[1]) {
					t.trail.push(here);
					if (t.trail.length > TRAIL_LENGTH) t.trail.shift();
				}
			}
		}
	}

	function snapshot(): TruckPosition[] {
		return trucks.map((t) => {
			// Offline trucks report their last known position.
			const p = t.trail[t.trail.length - 1];
			return {
				...t.seed,
				lat: p[0],
				lng: p[1],
				heading: t.heading,
				speedKph: t.status === 'moving' ? Math.round(t.speedKph) : 0,
				status: t.status,
				routeName: t.route.name,
				progress: Math.round((t.dist / t.route.length) * 100),
				updatedAt: t.lastSeen,
				trail: [...t.trail]
			};
		});
	}

	return { tick, snapshot, routes };
}
