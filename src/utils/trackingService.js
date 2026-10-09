/**
 * Real-Time Vehicle Tracking & Polyline Interpolation Service
 * Calculates vehicle positions, bearing angle, travelled/remaining paths, and dynamic milestones.
 */

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculateBearing(startLat, startLng, destLat, destLng) {
  const startLatRad = (startLat * Math.PI) / 180;
  const startLngRad = (startLng * Math.PI) / 180;
  const destLatRad = (destLat * Math.PI) / 180;
  const destLngRad = (destLng * Math.PI) / 180;

  const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
  const x =
    Math.cos(startLatRad) * Math.sin(destLatRad) -
    Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);

  let brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

export function getInterpolatedVehicleState(routePoints = [], progressFraction = 0) {
  if (!routePoints || routePoints.length === 0) {
    return {
      lat: 12.9716,
      lng: 77.5946,
      bearing: 0,
      pointIndex: 0,
      travelledPoints: [],
      remainingPoints: []
    };
  }

  if (routePoints.length === 1) {
    const p = routePoints[0];
    return {
      lat: p[0],
      lng: p[1],
      bearing: 0,
      pointIndex: 0,
      travelledPoints: [p],
      remainingPoints: [p]
    };
  }

  const progress = Math.max(0, Math.min(1, progressFraction));
  const segmentDistances = [];
  let totalDistanceMeters = 0;

  for (let i = 0; i < routePoints.length - 1; i++) {
    const p1 = routePoints[i];
    const p2 = routePoints[i + 1];
    const dist = haversineMeters(p1[0], p1[1], p2[0], p2[1]);
    segmentDistances.push(dist);
    totalDistanceMeters += dist;
  }

  if (totalDistanceMeters === 0) {
    const p = routePoints[0];
    return {
      lat: p[0],
      lng: p[1],
      bearing: 0,
      pointIndex: 0,
      travelledPoints: [p],
      remainingPoints: [p]
    };
  }

  const targetMeters = progress * totalDistanceMeters;
  let accumulatedMeters = 0;
  let currentSegmentIndex = 0;

  for (let i = 0; i < segmentDistances.length; i++) {
    if (accumulatedMeters + segmentDistances[i] >= targetMeters) {
      currentSegmentIndex = i;
      break;
    }
    accumulatedMeters += segmentDistances[i];
    if (i === segmentDistances.length - 1) {
      currentSegmentIndex = i;
    }
  }

  const pStart = routePoints[currentSegmentIndex];
  const pEnd = routePoints[currentSegmentIndex + 1] || pStart;
  const segDist = segmentDistances[currentSegmentIndex] || 1;
  const segProgressMeters = Math.max(0, targetMeters - accumulatedMeters);
  const segFraction = Math.max(0, Math.min(1, segProgressMeters / segDist));

  const currentLat = pStart[0] + (pEnd[0] - pStart[0]) * segFraction;
  const currentLng = pStart[1] + (pEnd[1] - pStart[1]) * segFraction;
  const bearing = calculateBearing(pStart[0], pStart[1], pEnd[0], pEnd[1]);

  const travelled = routePoints.slice(0, currentSegmentIndex + 1);
  travelled.push([currentLat, currentLng]);

  const remaining = [[currentLat, currentLng], ...routePoints.slice(currentSegmentIndex + 1)];

  return {
    lat: currentLat,
    lng: currentLng,
    bearing: Math.round(bearing),
    pointIndex: currentSegmentIndex,
    travelledPoints: travelled,
    remainingPoints: remaining
  };
}

export function getRouteMilestones(pickup = 'Pickup', drop = 'Destination', distanceKm = 145, progress = 0) {
  const isBengaluruMysuru = 
    (pickup.toLowerCase().includes('bengaluru') || pickup.toLowerCase().includes('bangalore')) &&
    (drop.toLowerCase().includes('mys') || drop.toLowerCase().includes('mysore'));

  let checkpoints = [];

  if (isBengaluruMysuru) {
    checkpoints = [
      { name: 'Trip Origin: Bengaluru', km: 0, note: 'Pickup completed' },
      { name: 'Kengeri NICE Road Junction', km: 22, note: 'Entering NH-275 Expressway' },
      { name: 'Bidadi Smart Tollway Plaza', km: 38, note: 'FASTag Toll Cleared' },
      { name: 'Ramanagara Bypass', km: 54, note: 'Cruising at 80 km/h' },
      { name: 'Channapatna Highway Rest Area', km: 72, note: 'Midway Halt & Refreshment' },
      { name: 'Maddur River Bridge', km: 90, note: 'Smooth expressway traffic' },
      { name: 'Mandya City Bypass Toll', km: 108, note: 'Approaching Sugar Belt' },
      { name: 'Srirangapatna Heritage River Gate', km: 128, note: 'Entering historical corridor' },
      { name: 'Destination: Mysuru Palace Ring Road', km: 145, note: 'Trip Final Destination' }
    ];
  } else {
    const total = Math.max(20, distanceKm);
    checkpoints = [
      { name: `Origin: ${pickup}`, km: 0, note: 'Trip Started' },
      { name: 'City Exit & Express Highway Gate', km: Math.round(total * 0.15), note: 'Joining National Highway' },
      { name: 'NHAI FASTag Tollway Plaza', km: Math.round(total * 0.35), note: 'Toll Deducted' },
      { name: 'Midway Highway Service Rest Area', km: Math.round(total * 0.55), note: 'Expressway Cruising' },
      { name: 'District Ring Road Junction', km: Math.round(total * 0.80), note: 'Approaching Destination' },
      { name: `Destination: ${drop}`, km: total, note: 'Final Destination' }
    ];
  }

  const currentKm = (distanceKm * progress) / 100;

  return checkpoints.map((cp, idx) => {
    const isPassed = currentKm >= cp.km;
    const isCurrent = !isPassed && (idx === 0 || currentKm >= checkpoints[idx - 1].km);
    return {
      ...cp,
      status: isPassed ? 'PASSED' : (isCurrent ? 'CURRENT' : 'UPCOMING'),
      distanceRemainingFromCar: Math.max(0, Math.round(cp.km - currentKm))
    };
  });
}
