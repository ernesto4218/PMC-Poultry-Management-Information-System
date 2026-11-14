import { auth } from '#lib/server/auth.ts';
import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request }) => {
		await auth.api.signOut({
			headers: request.headers // required so Better Auth can read & clear the session cookie
		});

		redirect(303, '/login');
	}
};
