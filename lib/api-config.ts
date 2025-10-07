/**
 * Centralized API configuration for the Vertriqe Dashboard
 * Contains all external API endpoints and related configuration
 */

export const API_CONFIG = {
  // TSDB (Time Series Database) API Configuration
  TSDB: {
    BASE_URL: "https://gtsdb-admin.vercel.app/api/tsdb",
    WITH_API_URL: "https://gtsdb-admin.vercel.app/api/tsdb?apiUrl=http%3A%2F%2F35.221.150.154%3A5556",
    ENCODED_API_URL: "http%3A%2F%2F35.221.150.154%3A5556",
    RAW_API_URL: "http://35.221.150.154:5556"
  }
} as const;

/**
 * Helper function to build TSDB URL with apiUrl parameter
 * @param includeApiUrl - Whether to include the apiUrl parameter
 * @returns The appropriate TSDB URL
 */
export function getTsdbUrl(includeApiUrl: boolean = true): string {
  return includeApiUrl ? API_CONFIG.TSDB.WITH_API_URL : API_CONFIG.TSDB.BASE_URL;
}

/**
 * Helper function to build TSDB URL with custom apiUrl parameter
 * @param apiUrl - Custom API URL to encode and append
 * @returns TSDB URL with custom apiUrl parameter
 */
export function getTsdbUrlWithCustomApi(apiUrl: string): string {
  const encodedUrl = encodeURIComponent(apiUrl);
  return `${API_CONFIG.TSDB.BASE_URL}?apiUrl=${encodedUrl}`;
}