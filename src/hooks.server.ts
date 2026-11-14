import type { Handle } from '@sveltejs/kit/hooks';
import { building } from '$app/env';
import { auth } from '#lib/server/auth.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect, json } from '@sveltejs/kit';

// Define a map of protected API routes and the roles allowed to access them
const apiRolePermissions: { route: string; allowedRoles: string[] }[] = [
	{ route: '/api/admin', allowedRoles: ['Admin'] },
	{ route: '/api/chick-batches', allowedRoles: ['Admin'] },
	{ route: '/api/chick-medicine', allowedRoles: ['Admin'] },
	{ route: '/api/farms', allowedRoles: ['Admin'] },
	{ route: '/api/posts', allowedRoles: ['Admin'] },
	{ route: '/api/products', allowedRoles: ['Admin'] },
	{ route: '/api/standard', allowedRoles: ['Admin'] },
	{ route: '/api/suppliers', allowedRoles: ['Admin'] },
	{ route: '/api/moderator', allowedRoles: ['Admin', 'Moderator'] },
	{ route: '/api/posts/create', allowedRoles: ['Admin', 'Moderator', 'Author'] }
];

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	const path = event.url.pathname;
	const user = event.locals.user;

	// --- 1. Protect API Routes Using a Permission Map ---
	if (path.startsWith('/api/')) {
		// Find if the current path matches any protected rule
		const matchedRule = apiRolePermissions.find((rule) => path.startsWith(rule.route));

		if (matchedRule) {
			if (!user) {
				return json({ error: 'Unauthorized - Please log in' }, { status: 401 });
			}

			if (!matchedRule.allowedRoles.includes(user.role)) {
				return json(
					{
						error: `Forbidden - Requires one of the following roles: ${matchedRule.allowedRoles.join(', ')}`
					},
					{ status: 403 }
				);
			}
		}
	}
	// --- 2. Protect Page Routes ---
	else {
		if (path.startsWith('/admin')) {
			if (!user) {
				throw redirect(303, '/login');
			}
			if (user.role !== 'Admin') {
				throw redirect(303, '/unauthorized');
			}
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
