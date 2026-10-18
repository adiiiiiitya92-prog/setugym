export interface GymQRPayload {
  gymId: string;
  gymName: string;
  latitude: number;
  longitude: number;
  generatedAt: string; // ISO timestamp
  token: string;
}

/**
 * Calculates the geodetic distance in meters between two coordinates using the Haversine formula.
 */
export const calculateHaversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
};

/**
 * Encodes gym attendance QR payload as JSON string.
 */
export const encodeGymQRPayload = (payload: GymQRPayload): string => {
  return JSON.stringify(payload);
};

/**
 * Decodes and validates the JSON payload structure from a scanned gym QR code.
 */
export const decodeGymQRPayload = (qrString: string): GymQRPayload | null => {
  try {
    const parsed = JSON.parse(qrString);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.gymId === 'string' &&
      typeof parsed.gymName === 'string' &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.generatedAt === 'string' &&
      typeof parsed.token === 'string'
    ) {
      return parsed as GymQRPayload;
    }
  } catch (e) {
    // Ignore error, return null
  }
  return null;
};
