export const constructAuthUrl = (env: Env) => {
	const clientId = env.GOOGLE_APP_CLIENT_ID;
	const redirectUri = env.GOOGLE_REDIRECT_URI;
	const scope = 'https://www.googleapis.com/auth/calendar openid';
	const responseType = 'code';

	const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${encodeURIComponent(
		scope
	)}&response_type=${responseType}&access_type=offline&prompt=consent`;

	return authUrl;
};
