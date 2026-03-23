export async function getCoordinates(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching coordinates:", error);
    return null;
  }
}

export async function calculateDistance(originCity: string, destinationCity: string): Promise<{ distanceKm: number; durationHours: number } | null> {
  try {
    const originCoords = await getCoordinates(originCity);
    const destCoords = await getCoordinates(destinationCity);

    if (!originCoords || !destCoords) {
      return null;
    }

    const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${originCoords.lon},${originCoords.lat};${destCoords.lon},${destCoords.lat}?overview=false`);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const distanceMeters = data.routes[0].distance;
      const durationSeconds = data.routes[0].duration;
      return {
        distanceKm: Math.round(distanceMeters / 1000),
        durationHours: Math.round((durationSeconds / 3600) * 10) / 10
      };
    }
    return null;
  } catch (error) {
    console.error("Error calculating distance:", error);
    return null;
  }
}
