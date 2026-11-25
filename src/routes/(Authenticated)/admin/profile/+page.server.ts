import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import {
	saveAvatar,
	deleteAvatarByUrl,
	InvalidImageError,
	MAX_AVATAR_BYTES
} from '#lib/server/avatars.ts';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '#lib/server/auth.ts';

const LOGIN_PATH = '/login';

function errorMessage(e: unknown, fallback: string) {
	if (e instanceof APIError) return e.body?.message ?? e.message ?? fallback;
	return fallback;
}

export const load: PageServerLoad = async ({ request }) => {
	const current = await auth.api.getSession({ headers: request.headers });
	if (!current) throw redirect(302, LOGIN_PATH);

	const [sessions, accounts] = await Promise.all([
		auth.api.listSessions({ headers: request.headers }),
		auth.api.listUserAccounts({ headers: request.headers })
	]);

	return {
		user: {
			id: current.user.id,
			name: current.user.name,
			email: current.user.email,
			emailVerified: current.user.emailVerified,
			image: current.user.image ?? null,
			role: (current.user as { role?: string | null }).role ?? 'User',
			createdAt: current.user.createdAt.toISOString(),
			updatedAt: current.user.updatedAt.toISOString()
		},
		currentSessionToken: current.session.token,
		sessions: sessions.map((s) => ({
			id: s.id,
			token: s.token,
			ipAddress: s.ipAddress ?? null,
			userAgent: s.userAgent ?? null,
			createdAt: new Date(s.createdAt).toISOString(),
			expiresAt: new Date(s.expiresAt).toISOString()
		})),
		// never expose tokens/passwords to the client – only provider info
		accounts: accounts.map((a) => ({
			id: a.id,
			providerId: a.providerId,
			createdAt: new Date(a.createdAt).toISOString()
		}))
	};
};

export const actions: Actions = {
	updateProfile: async ({ request }) => {
		const data = await request.formData();
		const name = String(data.get('name') ?? '').trim();

		if (name.length < 2) {
			return fail(400, { action: 'updateProfile', message: 'Name must be at least 2 characters.' });
		}
		if (name.length > 255) {
			return fail(400, { action: 'updateProfile', message: 'Name is too long.' });
		}

		try {
			await auth.api.updateUser({
				headers: request.headers,
				body: { name }
			});
		} catch (e) {
			return fail(400, {
				action: 'updateProfile',
				message: errorMessage(e, 'Could not update profile.')
			});
		}
		return { action: 'updateProfile', success: true, message: 'Profile updated.' };
	},

	uploadAvatar: async ({ request }) => {
		const current = await auth.api.getSession({ headers: request.headers });
		if (!current) throw redirect(302, LOGIN_PATH);

		const data = await request.formData();
		const file = data.get('avatar');

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { action: 'uploadAvatar', message: 'Choose an image to upload.' });
		}
		if (file.size > MAX_AVATAR_BYTES) {
			return fail(400, { action: 'uploadAvatar', message: 'Image must be 2 MB or smaller.' });
		}

		let url: string;
		try {
			url = await saveAvatar(current.user.id, file);
		} catch (e) {
			if (e instanceof InvalidImageError) {
				return fail(400, { action: 'uploadAvatar', message: e.message });
			}
			return fail(500, { action: 'uploadAvatar', message: 'Could not save the image.' });
		}

		try {
			await auth.api.updateUser({ headers: request.headers, body: { image: url } });
		} catch (e) {
			await deleteAvatarByUrl(url); // don't leave an orphaned file behind
			return fail(400, {
				action: 'uploadAvatar',
				message: errorMessage(e, 'Could not update photo.')
			});
		}

		await deleteAvatarByUrl(current.user.image); // remove the previous upload
		return { action: 'uploadAvatar', success: true, message: 'Profile photo updated.' };
	},

	removeAvatar: async ({ request }) => {
		const current = await auth.api.getSession({ headers: request.headers });
		if (!current) throw redirect(302, LOGIN_PATH);

		try {
			await auth.api.updateUser({ headers: request.headers, body: { image: null } });
		} catch (e) {
			return fail(400, {
				action: 'removeAvatar',
				message: errorMessage(e, 'Could not remove photo.')
			});
		}

		await deleteAvatarByUrl(current.user.image);
		return { action: 'removeAvatar', success: true, message: 'Profile photo removed.' };
	},

	changeEmail: async ({ request }) => {
		const data = await request.formData();
		const newEmail = String(data.get('newEmail') ?? '')
			.trim()
			.toLowerCase();

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
			return fail(400, { action: 'changeEmail', message: 'Enter a valid email address.' });
		}

		try {
			// requires `user.changeEmail.enabled: true` in your Better Auth config
			await auth.api.changeEmail({
				headers: request.headers,
				body: { newEmail, callbackURL: '/profile' }
			});
		} catch (e) {
			return fail(400, {
				action: 'changeEmail',
				message: errorMessage(e, 'Could not change email.')
			});
		}
		return {
			action: 'changeEmail',
			success: true,
			message: 'Request submitted. Check your inbox to confirm the change.'
		};
	},

	changePassword: async ({ request }) => {
		const data = await request.formData();
		const currentPassword = String(data.get('currentPassword') ?? '');
		const newPassword = String(data.get('newPassword') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');
		const revokeOtherSessions = data.get('revokeOtherSessions') === 'on';

		if (!currentPassword) {
			return fail(400, { action: 'changePassword', message: 'Enter your current password.' });
		}
		if (newPassword.length < 8) {
			return fail(400, {
				action: 'changePassword',
				message: 'New password must be at least 8 characters.'
			});
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { action: 'changePassword', message: 'Passwords do not match.' });
		}

		try {
			await auth.api.changePassword({
				headers: request.headers,
				body: { currentPassword, newPassword, revokeOtherSessions }
			});
		} catch (e) {
			return fail(400, {
				action: 'changePassword',
				message: errorMessage(e, 'Could not change password.')
			});
		}
		return { action: 'changePassword', success: true, message: 'Password changed.' };
	},

	resendVerification: async ({ request }) => {
		const current = await auth.api.getSession({ headers: request.headers });
		if (!current) throw redirect(302, LOGIN_PATH);

		try {
			await auth.api.sendVerificationEmail({
				body: { email: current.user.email, callbackURL: '/profile' }
			});
		} catch (e) {
			return fail(400, {
				action: 'resendVerification',
				message: errorMessage(e, 'Could not send verification email.')
			});
		}
		return { action: 'resendVerification', success: true, message: 'Verification email sent.' };
	},

	revokeSession: async ({ request }) => {
		const data = await request.formData();
		const token = String(data.get('token') ?? '');
		if (!token) return fail(400, { action: 'revokeSession', message: 'Missing session.' });

		try {
			await auth.api.revokeSession({ headers: request.headers, body: { token } });
		} catch (e) {
			return fail(400, {
				action: 'revokeSession',
				message: errorMessage(e, 'Could not revoke session.')
			});
		}
		return { action: 'revokeSession', success: true, message: 'Session revoked.' };
	},

	revokeOtherSessions: async ({ request }) => {
		try {
			await auth.api.revokeOtherSessions({ headers: request.headers });
		} catch (e) {
			return fail(400, {
				action: 'revokeOtherSessions',
				message: errorMessage(e, 'Could not revoke sessions.')
			});
		}
		return {
			action: 'revokeOtherSessions',
			success: true,
			message: 'Signed out of all other devices.'
		};
	},

	signOut: async ({ request }) => {
		try {
			await auth.api.signOut({ headers: request.headers });
		} catch {
			/* ignore – redirect regardless */
		}
		throw redirect(302, LOGIN_PATH);
	},

	deleteAccount: async ({ request }) => {
		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		const confirm = String(data.get('confirm') ?? '');

		if (confirm !== 'DELETE') {
			return fail(400, { action: 'deleteAccount', message: 'Type DELETE to confirm.' });
		}
		if (!password) {
			return fail(400, { action: 'deleteAccount', message: 'Enter your password.' });
		}

		try {
			// requires `user.deleteUser.enabled: true` in your Better Auth config
			await auth.api.deleteUser({ headers: request.headers, body: { password } });
		} catch (e) {
			return fail(400, {
				action: 'deleteAccount',
				message: errorMessage(e, 'Could not delete account.')
			});
		}
		throw redirect(302, '/');
	}
};
