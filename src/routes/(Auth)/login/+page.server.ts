import { auth } from '#lib/server/auth.ts';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request, locals }) => {
	const session = await auth.api.getSession({
		headers: request.headers // Important to pass headers for cookies
	});

	if (session) {
		if (locals.user.role === 'Admin') {
			redirect(307, '/admin/farms');
		} else {
			redirect(403, '/unauthorized');
		}
	}

	return {
		session
	};
};
