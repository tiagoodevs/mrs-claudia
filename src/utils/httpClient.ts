import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import { performance } from 'node:perf_hooks';

export interface HttpRequestOptions {
    method: Method;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    authType?: 'none' | 'bearer' | 'basic' | 'apikey';
    authValue?: string; // token, "user:pass", or api key value
    authHeaderName?: string; // used when authType === 'apikey'
    timeoutMs?: number;
}

export interface HttpResult {
    ok: boolean;
    status: number | null;
    statusText: string | null;
    headers: Record<string, string>;
    data: unknown;
    durationMs: number;
    error?: string;
}

function buildAuthHeaders(options: HttpRequestOptions): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (options.authType) {
        case 'bearer':
            if (options.authValue) headers['Authorization'] = `Bearer ${options.authValue}`;
            break;
        case 'basic':
            if (options.authValue) {
                headers['Authorization'] = `Basic ${Buffer.from(options.authValue).toString('base64')}`;
            }
            break;
        case 'apikey':
            if (options.authValue) {
                headers[options.authHeaderName || 'X-API-Key'] = options.authValue;
            }
            break;
        default:
            break;
    }

    return headers;
}

/** Executes a single HTTP request and returns a normalized result with timing data. */
export async function executeHttpRequest(options: HttpRequestOptions): Promise<HttpResult> {
    const start = performance.now();

    const config: AxiosRequestConfig = {
        method: options.method,
        url: options.url,
        timeout: options.timeoutMs ?? Number(process.env.HTTP_TIMEOUT_MS || 15000),
        headers: {
            'User-Agent': process.env.HTTP_USER_AGENT || 'DiscordAPIToolkit/1.0',
            Accept: 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            ...buildAuthHeaders(options),
            ...(options.headers || {}),
        },
        data: options.body,
        validateStatus: () => true, // never throw on non-2xx; we classify manually
    };

    try {
        const response: AxiosResponse = await axios.request(config);
        const durationMs = Math.round(performance.now() - start);

        return {
            ok: response.status >= 200 && response.status < 400,
            status: response.status,
            statusText: response.statusText,
            headers: flattenHeaders(response.headers),
            data: response.data,
            durationMs,
        };
    } catch (err) {
        const durationMs = Math.round(performance.now() - start);
        const message = err instanceof Error ? err.message : 'Unknown request error';

        return {
            ok: false,
            status: null,
            statusText: null,
            headers: {},
            data: null,
            durationMs,
            error: message,
        };
    }
}

function flattenHeaders(headers: AxiosResponse['headers']): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers || {})) {
        out[key] = Array.isArray(value) ? value.join(', ') : String(value);
    }
    return out;
}

/** Fetches only raw response headers (used by /debug headers). */
export async function fetchHeadersOnly(
    url: string,
    method: Method = 'GET',
): Promise<{ headers: Record<string, string>; status: number | null; durationMs: number; error?: string }> {
    const result = await executeHttpRequest({ method, url });
    return {
        headers: result.headers,
        status: result.status,
        durationMs: result.durationMs,
        error: result.error,
    };
}
