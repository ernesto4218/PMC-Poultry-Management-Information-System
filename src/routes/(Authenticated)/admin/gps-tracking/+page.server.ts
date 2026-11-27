import { listActiveTrips } from '#lib/services/trackingmap.services.ts';

export const load = async () => {
	const trips = await listActiveTrips();
	return { trips };
};
