interface GoogleServiceAccountKey {
    client_email: string;
    private_key: string;
    private_key_id: string;
}

interface GoogleOAuthResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

class ServiceAccountError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ServiceAccountError';
    }
}

async function createJWT(env: Env): Promise<string> {
    let credentials: GoogleServiceAccountKey;
    try {
        if (!env.GOOGLE_SERVICE_ACCOUNT_KEY) {
            throw new ServiceAccountError('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
        }
        
        try {
            const parsed = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_KEY);
            
            if (!parsed.client_email || !parsed.private_key || !parsed.private_key_id) {
                throw new ServiceAccountError('Invalid service account key format');
            }
            credentials = parsed;
        } catch (e) {
            const error = e as Error;
            console.error('Service account key parsing error:', error.message);
            console.error('Key content preview:', env.GOOGLE_SERVICE_ACCOUNT_KEY.slice(0, 50) + '...');
            throw new ServiceAccountError(`Failed to parse service account key: ${error.message}`);
        }

        const now = Math.floor(Date.now() / 1000);

        // JWT Header
        const header = {
            alg: 'RS256',
            typ: 'JWT',
            kid: credentials.private_key_id
        };

        // JWT Claim Set
        const claimSet = {
            iss: credentials.client_email,
            scope: 'https://www.googleapis.com/auth/calendar',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        // Create base64url encoded parts
        const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        const encodedClaimSet = btoa(JSON.stringify(claimSet)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        // Create signing input
        const signInput = `${encodedHeader}.${encodedClaimSet}`;

        // Clean and prepare private key
        const privateKey = credentials.private_key
            .replace('-----BEGIN PRIVATE KEY-----\n', '')
            .replace('\n-----END PRIVATE KEY-----\n', '')
            .replace(/\n/g, '');

        // Import private key
        const binaryKey = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
        const cryptoKey = await crypto.subtle.importKey(
            'pkcs8',
            binaryKey,
            {
                name: 'RSASSA-PKCS1-v1_5',
                hash: 'SHA-256'
            },
            false,
            ['sign']
        );

        // Sign the input
        const encoder = new TextEncoder();
        const signatureBytes = await crypto.subtle.sign(
            'RSASSA-PKCS1-v1_5',
            cryptoKey,
            encoder.encode(signInput)
        );

        // Convert signature to base64url
        const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // Combine to create JWT
        const jwt = `${signInput}.${signature}`;

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${errorData}`);
        }

        const tokenResponse = await response.json() as GoogleOAuthResponse;
        return tokenResponse.access_token;  // Return the token here

    } catch (e) {
        const error = e as Error;
        console.error('JWT creation error:', error.message);
        throw new ServiceAccountError(`JWT creation failed: ${error.message}`);
    }
}

export async function makeGoogleAPIRequest<T>(
    url: string, 
    method: string, 
    env: Env,
    body?: any
): Promise<T> {
    try {
        const token = await createJWT(env);
        
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google API request failed: ${response.status} ${errorText}`);
        }

        if (method === 'DELETE') {
            return { id: '' } as T;
        }

        return await response.json() as T;
    } catch (e) {
        const error = e as Error;
        console.error('Google API request error:', error.message);
        throw error;
    }
}

interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000, // Start with 1 second delay
    maxDelayMs: 10000,    // Max 10 seconds delay
    backoffMultiplier: 2  // Double the delay each time
};

export async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface GoogleApiErrorDetail {
    domain: string;
    reason: string;
    message: string;
}

interface GoogleApiError {
    errors: GoogleApiErrorDetail[];
    code: number;
    message: string;
}

interface GoogleApiErrorResponse {
    error: GoogleApiError;
}

export async function makeGoogleAPIRequestWithRetry<T>(
    url: string,
    method: string,
    env: Env,
    body?: any,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
    let lastError: Error | null = null;
    let currentDelay = retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
        try {
            const token = await createJWT(env);
            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            const response = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            // If rate limited, throw error to trigger retry
            if (response.status === 403) {
                const errorData = await response.json() as GoogleApiErrorResponse;
                if (errorData?.error?.errors?.[0]?.reason === 'rateLimitExceeded') {
                    throw new Error('Rate limit exceeded');
                }
            }

            if (!response.ok) {
                const errorData = await response.json() as GoogleApiErrorResponse;
                throw new Error(`Google API request failed: ${response.status} ${JSON.stringify(errorData)}`);
            }

            if (method === 'DELETE') {
                return { id: '' } as T;
            }

            return await response.json() as T;
        } catch (e) {
            const error = e as Error;
            lastError = error;

            // If this was our last retry, throw the error
            if (attempt === retryConfig.maxRetries) {
                console.error(`Failed after ${retryConfig.maxRetries} retries:`, error.message);
                throw error;
            }

            // Only retry on rate limit errors
            if (!error.message.includes('Rate limit exceeded')) {
                throw error;
            }

            console.warn(`Attempt ${attempt + 1} failed, retrying in ${currentDelay}ms...`);
            await delay(currentDelay);

            // Increase delay for next attempt
            currentDelay = Math.min(
                currentDelay * retryConfig.backoffMultiplier,
                retryConfig.maxDelayMs
            );
        }
    }

    throw lastError || new Error('Unexpected retry failure');
}