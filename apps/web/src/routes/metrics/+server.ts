import { getMetrics, getContentType } from '$lib/server/metrics';
import type { RequestHandler } from './$types';

/**
 * Prometheus metrics endpoint
 *
 * Exposes application metrics for Prometheus scraping
 */
export const GET: RequestHandler = async () => {
	const metrics = await getMetrics();

	return new Response(metrics, {
		headers: {
			'Content-Type': getContentType()
		}
	});
};

// Disable prerendering for dynamic metrics
export const prerender = false;
