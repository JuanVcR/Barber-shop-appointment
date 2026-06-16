import { env } from '../config/env.js';

type NominatimResponse = {
  display_name?: string;
};

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const REQUEST_TIMEOUT_MS = 5_000;

export const reverseGeocodingService = {
  async getAddress(latitude: number, longitude: number) {
    try {
      const url = new URL(NOMINATIM_URL);
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', latitude.toString());
      url.searchParams.set('lon', longitude.toString());
      url.searchParams.set('addressdetails', '1');

      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': `BarberFlow/1.0 (${env.APP_URL})`,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as NominatimResponse;
      return data.display_name?.trim() || null;
    } catch {
      return null;
    }
  },
};
