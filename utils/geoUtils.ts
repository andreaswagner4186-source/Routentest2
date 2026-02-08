
import { Stop } from "../types";

/**
 * Calculates the distance between two points using the Haversine formula in kilometers.
 */
export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface Point {
  lat: number;
  lng: number;
}

/**
 * Nearest Neighbor Algorithm for TSP (Traveling Salesman Problem)
 * @param stops Array of delivery stops (must have lat/lng)
 * @param start Custom start point
 * @param end Optional fixed end point
 */
export function optimizeRouteNearestNeighbor(
  stops: Stop[],
  start: Point,
  end?: Point
): Stop[] {
  if (stops.length === 0) return [];

  const unvisited = [...stops].filter(s => s.lat !== undefined && s.lng !== undefined);
  const optimized: Stop[] = [];
  let currentPos = start;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      // If an end point is specified, we might want to weigh proximity to it differently 
      // but simple NN just goes to the closest next stop.
      const dist = getDistance(
        currentPos.lat,
        currentPos.lng,
        unvisited[i].lat!,
        unvisited[i].lng!
      );
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = i;
      }
    }

    const nextStop = unvisited.splice(closestIndex, 1)[0];
    optimized.push(nextStop);
    currentPos = { lat: nextStop.lat!, lng: nextStop.lng! };
  }

  // Handle stops without coordinates
  const invalidStops = stops.filter(s => s.lat === undefined || s.lng === undefined);
  
  return [...optimized, ...invalidStops];
}
