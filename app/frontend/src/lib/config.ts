// Runtime configuration
let runtimeConfig: {
  API_BASE_URL: string;
} | null = null;

// Configuration loading state
let configLoading = true;

// Default fallback configuration
const resolveDefaultApiBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname.toLowerCase();

  // Production Vercel frontend is static-only; send API calls to backend service.
  if (host === 'researchworkspace.vercel.app') {
    return 'https://researchworkspace.onrender.com';
  }

  return '';
};

const defaultConfig = {
  API_BASE_URL: resolveDefaultApiBaseUrl(),
};

// Function to load runtime configuration
export async function loadRuntimeConfig(): Promise<void> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 2000);
  try {
    // Try to load configuration from a config endpoint
    const response = await fetch('/api/config', { signal: controller.signal });
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      // Only parse as JSON if the response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        runtimeConfig = await response.json();
        console.log('Runtime config loaded successfully');
      } else {
        console.log(
          'Config endpoint returned non-JSON response, skipping runtime config'
        );
      }
    } else {
      console.log('Config fetch failed with status:', response.status);
    }
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') {
      console.log('Runtime config request timed out, using defaults');
    } else {
      console.log('Failed to load runtime config, using defaults:', error);
    }
  } finally {
    window.clearTimeout(timeoutId);
    configLoading = false;
  }
}

// Get current configuration
export function getConfig() {
  // First try runtime config (for Lambda)
  if (runtimeConfig) {
    console.log('Using runtime config');
    return runtimeConfig;
  }

  // Then try Vite environment variables (for local development)
  if (import.meta.env.VITE_API_BASE_URL) {
    const viteConfig = {
      API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    };
    console.log('Using Vite environment config');
    return viteConfig;
  }

  if (configLoading) {
    console.log('Config still loading, using default config');
  }

  // Finally fall back to default
  console.log('Using default config');
  return defaultConfig;
}

// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL(): string {
  return getConfig().API_BASE_URL;
}

// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();

export const config = {
  get API_BASE_URL() {
    return getAPIBaseURL();
  },
};
