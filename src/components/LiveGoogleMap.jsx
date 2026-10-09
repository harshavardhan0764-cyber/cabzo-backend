import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Crosshair, 
  Layers, 
  Map as MapIcon, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  Check, 
  Globe, 
  X,
  Car,
  Bus,
  Zap,
  Navigation,
  Route as RouteIcon,
  Compass,
  Radio
} from 'lucide-react';
import { 
  loadGoogleMaps, 
  CABBAZAR_DARK_MAP_STYLES, 
  getGoogleMapsApiKey, 
  setRuntimeApiKey, 
  getApiKeyStatus,
  onGoogleAuthFailure 
} from '../utils/googleMapsLoader';
import { getCurrentDeviceLocationGoogle } from '../utils/googleLocationService';
import { getInterpolatedVehicleState } from '../utils/trackingService';

export default function LiveGoogleMap({
  pickupLocation = null,
  dropLocation = null,
  stopsLocations = [],
  availableRoutes = [],
  selectedRouteId = 'direct_highway',
  onSelectRoute = null,
  distanceKm = 145,
  duration = '3 hrs 16 mins',
  height = 'h-64 sm:h-72',
  className = '',
  showHud = false,
  interactive = true,
  // Real-Time Vehicle Tracking Props
  isLiveTracking = false,
  trackingProgress = 0, // 0 to 100
  liveSpeed = 72,
  autoCenterCar = true,
  onToggleAutoCenter = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const googleMarkersRef = useRef([]);
  const googlePolylinesRef = useRef([]);
  const googleCarMarkerRef = useRef(null);
  
  // Leaflet references
  const leafletMapRef = useRef(null);
  const leafletSatelliteLayerRef = useRef(null);
  const leafletRoadLayerRef = useRef(null);
  const leafletLabelsLayerRef = useRef(null);
  const leafletPolylinesRef = useRef([]);
  const leafletMarkersRef = useRef([]);
  const leafletCarMarkerRef = useRef(null);

  const [mapType, setMapType] = useState('satellite'); // 'satellite' | 'roadmap'
  const [engine, setEngine] = useState('leaflet'); // 'google' | 'leaflet'
  const [isLoadingGps, setIsLoadingGps] = useState(false);
  const [isFollowingVehicle, setIsFollowingVehicle] = useState(autoCenterCar);
  const userGpsMarkerRef = useRef(null);

  // Sync isFollowingVehicle with autoCenterCar prop
  useEffect(() => {
    setIsFollowingVehicle(autoCenterCar);
  }, [autoCenterCar]);

  // 1. Hook auth failure callback
  useEffect(() => {
    onGoogleAuthFailure((err) => {
      console.warn('Google Maps auth error -> switching to satellite engine:', err?.message || 'Auth failure');
      setEngine('leaflet');
      const pLat = Number(pickupLocation?.lat) || 12.9716;
      const pLng = Number(pickupLocation?.lng) || 77.5946;
      mountLeafletSatellite(pLat, pLng);
    });
  }, [pickupLocation?.lat, pickupLocation?.lng]);

  // 2. Initialize Map (Leaflet Satellite by default for instant 0ms load, Google Maps only if user provided key)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;

      const pLat = Number(pickupLocation?.lat) || 12.9716;
      const pLng = Number(pickupLocation?.lng) || 77.5946;

      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
        leafletMapRef.current = null;
      }
      
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
      mapContainerRef.current.innerHTML = '';

      // Always initialize Leaflet High-Res Satellite (Esri) & Clean Roadmap (CartoDB)
      // ZERO Google Maps API key required, ZERO watermarks, ZERO error alerts, 100% free and reliable
      if (isMounted) {
        setEngine('leaflet');
        mountLeafletSatellite(pLat, pLng);
      }
    }

    const timer = setTimeout(initMap, 40);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pickupLocation?.lat, pickupLocation?.lng]);

  // Mount Leaflet Satellite Map Engine
  const mountLeafletSatellite = (lat, lng) => {
    if (!mapContainerRef.current) return;
    try {
      if (leafletMapRef.current) {
        try { leafletMapRef.current.remove(); } catch {}
      }

      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }
      mapContainerRef.current.innerHTML = '';

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 11,
        zoomControl: false,
        attributionControl: false
      });
      leafletMapRef.current = map;

      // 1. High-Resolution Esri World Imagery (Satellite) - completely free, no API key
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      leafletSatelliteLayerRef.current = satLayer;

      // 2. CartoDB Clean Voyager Roadmap (Crisp, light, high-contrast, free, no API key)
      const roadLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      );
      leafletRoadLayerRef.current = roadLayer;

      // 3. Crisp Road & City Labels Layer
      const labelsLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        { maxZoom: 19, subdomains: 'abcd' }
      );
      leafletLabelsLayerRef.current = labelsLayer;

      if (mapType === 'satellite') {
        satLayer.addTo(map);
        labelsLayer.addTo(map);
      } else {
        roadLayer.addTo(map);
      }

      renderLeafletRoutes(map);

      setTimeout(() => {
        try { map.invalidateSize(); } catch {}
      }, 100);

    } catch (e) {
      console.error('Leaflet mount error:', e);
    }
  };

  // Render Routes & Real-time Live Car Marker on Leaflet
  const renderLeafletRoutes = (map) => {
    if (!map) return;

    // Clear previous markers
    leafletMarkersRef.current.forEach(m => {
      try { map.removeLayer(m); } catch {}
    });
    leafletMarkersRef.current = [];
    
    // Clear previous polylines
    leafletPolylinesRef.current.forEach(p => {
      try { map.removeLayer(p); } catch {}
    });
    leafletPolylinesRef.current = [];

    const bounds = [];

    // Pickup Marker (A - Green)
    if (pickupLocation?.lat && pickupLocation?.lng) {
      const pLatLng = [Number(pickupLocation.lat), Number(pickupLocation.lng)];
      bounds.push(pLatLng);

      const pIcon = L.divIcon({
        className: 'custom-pin-pickup',
        html: `<div style="background:#10b981; color:#fff; width:28px; height:28px; border-radius:50%; border:3px solid #ffffff; font-weight:900; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(0,0,0,0.8);">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const m = L.marker(pLatLng, { icon: pIcon }).addTo(map);
      leafletMarkersRef.current.push(m);
    }

    // Stops (1, 2 - Amber)
    (stopsLocations || []).forEach((stop, idx) => {
      if (stop && stop.lat && stop.lng) {
        const sLatLng = [Number(stop.lat), Number(stop.lng)];
        bounds.push(sLatLng);

        const sIcon = L.divIcon({
          className: `custom-pin-stop-${idx}`,
          html: `<div style="background:#f59e0b; color:#0f172a; width:24px; height:24px; border-radius:50%; border:2px solid #ffffff; font-weight:900; font-size:10px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 10px rgba(0,0,0,0.8);">${idx + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const m = L.marker(sLatLng, { icon: sIcon }).addTo(map);
        leafletMarkersRef.current.push(m);
      }
    });

    // Drop Marker (B - Red)
    if (dropLocation?.lat && dropLocation?.lng) {
      const dLatLng = [Number(dropLocation.lat), Number(dropLocation.lng)];
      bounds.push(dLatLng);

      const dIcon = L.divIcon({
        className: 'custom-pin-drop',
        html: `<div style="background:#f43f5e; color:#fff; width:28px; height:28px; border-radius:50%; border:3px solid #ffffff; font-weight:900; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(0,0,0,0.8);">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const m = L.marker(dLatLng, { icon: dIcon }).addTo(map);
      leafletMarkersRef.current.push(m);
    }

    if (bounds.length >= 2) {
      const primaryRoute = (availableRoutes && availableRoutes.length > 0) 
        ? (availableRoutes.find(r => r.id === selectedRouteId) || availableRoutes[0])
        : { routePoints: bounds };

      const pts = primaryRoute.routePoints && primaryRoute.routePoints.length > 0 
        ? primaryRoute.routePoints 
        : bounds;

      // Real-time Vehicle Tracking Calculation
      if (isLiveTracking) {
        const vehicleState = getInterpolatedVehicleState(pts, trackingProgress / 100);

        // 1. Travelled Path (Emerald Green)
        if (vehicleState.travelledPoints && vehicleState.travelledPoints.length >= 2) {
          const travelledPoly = L.polyline(vehicleState.travelledPoints, {
            color: '#10b981',
            weight: 6,
            opacity: 0.95
          }).addTo(map);
          leafletPolylinesRef.current.push(travelledPoly);
        }

        // 2. Remaining Path (Glowing Orange)
        if (vehicleState.remainingPoints && vehicleState.remainingPoints.length >= 2) {
          const remainingGlow = L.polyline(vehicleState.remainingPoints, {
            color: '#ea580c',
            weight: 7,
            opacity: 0.35
          }).addTo(map);
          leafletPolylinesRef.current.push(remainingGlow);

          const remainingPoly = L.polyline(vehicleState.remainingPoints, {
            color: '#f97316',
            weight: 5,
            opacity: 1
          }).addTo(map);
          leafletPolylinesRef.current.push(remainingPoly);
        }

        // 3. Animated Real-time Moving Cab Marker
        const carIcon = L.divIcon({
          className: 'custom-live-cab-marker',
          html: `
            <div style="position:relative; width:48px; height:48px; display:flex; align-items:center; justify-content:center;">
              <!-- Live Speed & Telemetry Pill -->
              <div style="position:absolute; top:-22px; left:50%; transform:translateX(-50%); background:rgba(15,23,42,0.95); color:#38bdf8; border:1px solid rgba(56,189,248,0.5); font-size:9px; font-weight:900; padding:1px 6px; border-radius:9999px; white-space:nowrap; box-shadow:0 2px 10px rgba(0,0,0,0.8); z-index:20; display:flex; align-items:center; gap:2px;">
                <span>🚕</span>
                <span>${liveSpeed} km/h</span>
              </div>
              <!-- Pulse Radar Waves -->
              <div style="position:absolute; width:44px; height:44px; border-radius:50%; background:rgba(249,115,22,0.35); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
              <!-- Rotated Vehicle Cab Body -->
              <div style="transform:rotate(${vehicleState.bearing}deg); transition:transform 0.4s ease; width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg, #f59e0b, #ea580c); border:3px solid #ffffff; display:flex; align-items:center; justify-content:center; box-shadow:0 0 18px rgba(249,115,22,0.95); font-size:18px;">
                🚖
              </div>
            </div>
          `,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        if (leafletCarMarkerRef.current) {
          try { map.removeLayer(leafletCarMarkerRef.current); } catch {}
        }
        const carMarker = L.marker([vehicleState.lat, vehicleState.lng], { icon: carIcon, zIndexOffset: 1000 }).addTo(map);
        leafletCarMarkerRef.current = carMarker;
        leafletMarkersRef.current.push(carMarker);

        // Auto-center camera on vehicle if following
        if (isFollowingVehicle) {
          map.panTo([vehicleState.lat, vehicleState.lng], { animate: true, duration: 0.5 });
        }

      } else {
        // Standard static direct route
        const glowPoly = L.polyline(pts, {
          color: '#ea580c',
          weight: 8,
          opacity: 0.35
        }).addTo(map);
        leafletPolylinesRef.current.push(glowPoly);

        const poly = L.polyline(pts, {
          color: '#f97316',
          weight: 5,
          opacity: 1
        }).addTo(map);
        leafletPolylinesRef.current.push(poly);

        const allPointsForBounds = [...bounds];
        if (primaryRoute.routePoints && primaryRoute.routePoints.length > 0) {
          const step = Math.max(1, Math.floor(primaryRoute.routePoints.length / 25));
          for (let i = 0; i < primaryRoute.routePoints.length; i += step) {
            allPointsForBounds.push(primaryRoute.routePoints[i]);
          }
        }

        map.fitBounds(L.latLngBounds(allPointsForBounds.length > 0 ? allPointsForBounds : bounds), {
          padding: [45, 45],
          maxZoom: 14
        });
      }
    }
  };

  // Re-render Leaflet routes when route selection, locations, or tracking state changes
  useEffect(() => {
    if (engine === 'leaflet' && leafletMapRef.current) {
      renderLeafletRoutes(leafletMapRef.current);
    }
  }, [selectedRouteId, availableRoutes, engine, pickupLocation, dropLocation, stopsLocations, isLiveTracking, trackingProgress, liveSpeed, isFollowingVehicle]);

  // 3. Handle Map / Satellite Toggle
  useEffect(() => {
    if (engine === 'google' && mapInstanceRef.current && window.google?.maps) {
      const googleMaps = window.google.maps;
      if (mapType === 'satellite') {
        mapInstanceRef.current.setMapTypeId(googleMaps.MapTypeId.HYBRID);
        mapInstanceRef.current.setOptions({ styles: null });
      } else {
        mapInstanceRef.current.setMapTypeId(googleMaps.MapTypeId.ROADMAP);
        mapInstanceRef.current.setOptions({ styles: CABBAZAR_DARK_MAP_STYLES });
      }
    } else if (engine === 'leaflet' && leafletMapRef.current) {
      const map = leafletMapRef.current;
      if (mapType === 'satellite') {
        if (leafletRoadLayerRef.current) map.removeLayer(leafletRoadLayerRef.current);
        if (leafletSatelliteLayerRef.current) leafletSatelliteLayerRef.current.addTo(map);
        if (leafletLabelsLayerRef.current) leafletLabelsLayerRef.current.addTo(map);
      } else {
        if (leafletSatelliteLayerRef.current) map.removeLayer(leafletSatelliteLayerRef.current);
        if (leafletLabelsLayerRef.current) map.removeLayer(leafletLabelsLayerRef.current);
        if (leafletRoadLayerRef.current) leafletRoadLayerRef.current.addTo(map);
      }
    }
  }, [mapType, engine]);

  // 4. Render Google Maps Routes & Live Car Marker
  useEffect(() => {
    if (engine !== 'google' || !mapInstanceRef.current || !window.google?.maps) return;
    const googleMaps = window.google.maps;
    const map = mapInstanceRef.current;

    // Clear previous
    googleMarkersRef.current.forEach(m => m.setMap(null));
    googleMarkersRef.current = [];

    googlePolylinesRef.current.forEach(p => p.setMap(null));
    googlePolylinesRef.current = [];

    const bounds = new googleMaps.LatLngBounds();
    let hasPoints = false;

    // Pickup Marker
    if (pickupLocation?.lat && pickupLocation?.lng) {
      const pLatLng = new googleMaps.LatLng(Number(pickupLocation.lat), Number(pickupLocation.lng));
      bounds.extend(pLatLng);
      hasPoints = true;

      const pickupMarker = new googleMaps.Marker({
        position: pLatLng,
        map,
        title: `Pickup: ${pickupLocation.name || 'Pickup Point'}`,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#10b981',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        label: {
          text: 'A',
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '12px'
        }
      });
      googleMarkersRef.current.push(pickupMarker);
    }

    // Stops
    (stopsLocations || []).forEach((stop, idx) => {
      if (stop && stop.lat && stop.lng) {
        const sLatLng = new googleMaps.LatLng(Number(stop.lat), Number(stop.lng));
        bounds.extend(sLatLng);
        hasPoints = true;

        const stopMarker = new googleMaps.Marker({
          position: sLatLng,
          map,
          title: `Stop #${idx + 1}: ${stop.name || 'Halt'}`,
          icon: {
            path: googleMaps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#f59e0b',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          },
          label: {
            text: `${idx + 1}`,
            color: '#0f172a',
            fontWeight: '900',
            fontSize: '10px'
          }
        });
        googleMarkersRef.current.push(stopMarker);
      }
    });

    // Drop Marker
    if (dropLocation?.lat && dropLocation?.lng) {
      const dLatLng = new googleMaps.LatLng(Number(dropLocation.lat), Number(dropLocation.lng));
      bounds.extend(dLatLng);
      hasPoints = true;

      const dropMarker = new googleMaps.Marker({
        position: dLatLng,
        map,
        title: `Destination: ${dropLocation.name || 'Drop Point'}`,
        icon: {
          path: googleMaps.SymbolPath.CIRCLE,
          scale: 11,
          fillColor: '#f43f5e',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        label: {
          text: 'B',
          color: '#ffffff',
          fontWeight: '900',
          fontSize: '12px'
        }
      });
      googleMarkersRef.current.push(dropMarker);
    }

    // Draw Route Polylines
    const primaryRoute = (availableRoutes && availableRoutes.length > 0) 
      ? (availableRoutes.find(r => r.id === selectedRouteId) || availableRoutes[0])
      : null;

    if (primaryRoute && primaryRoute.routePoints && primaryRoute.routePoints.length > 0) {
      const rawPts = primaryRoute.routePoints;

      if (isLiveTracking) {
        const vehicleState = getInterpolatedVehicleState(rawPts, trackingProgress / 100);

        // Travelled Polyline (Green)
        if (vehicleState.travelledPoints && vehicleState.travelledPoints.length >= 2) {
          const tPts = vehicleState.travelledPoints.map(p => new googleMaps.LatLng(p[0], p[1]));
          const travelledPoly = new googleMaps.Polyline({
            path: tPts,
            geodesic: true,
            strokeColor: '#10b981',
            strokeOpacity: 1,
            strokeWeight: 6,
            map
          });
          googlePolylinesRef.current.push(travelledPoly);
        }

        // Remaining Polyline (Orange)
        if (vehicleState.remainingPoints && vehicleState.remainingPoints.length >= 2) {
          const rPts = vehicleState.remainingPoints.map(p => new googleMaps.LatLng(p[0], p[1]));
          const remainingPoly = new googleMaps.Polyline({
            path: rPts,
            geodesic: true,
            strokeColor: '#f97316',
            strokeOpacity: 1,
            strokeWeight: 5,
            map
          });
          googlePolylinesRef.current.push(remainingPoly);
        }

        // Google Maps Vehicle Marker
        const carLatLng = new googleMaps.LatLng(vehicleState.lat, vehicleState.lng);
        const carMarker = new googleMaps.Marker({
          position: carLatLng,
          map,
          title: `Cab Enroute (${liveSpeed} km/h)`,
          icon: {
            path: googleMaps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 6,
            fillColor: '#f97316',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            rotation: vehicleState.bearing
          }
        });
        googleMarkersRef.current.push(carMarker);

        if (isFollowingVehicle) {
          map.panTo(carLatLng);
        }

      } else {
        const pts = rawPts.map(p => new googleMaps.LatLng(p[0], p[1]));
        const glowPolyline = new googleMaps.Polyline({
          path: pts,
          geodesic: true,
          strokeColor: '#ea580c',
          strokeOpacity: 0.35,
          strokeWeight: 9,
          map
        });
        googlePolylinesRef.current.push(glowPolyline);

        const polyline = new googleMaps.Polyline({
          path: pts,
          geodesic: true,
          strokeColor: '#f97316',
          strokeOpacity: 1,
          strokeWeight: 5,
          map
        });
        googlePolylinesRef.current.push(polyline);

        const step = Math.max(1, Math.floor(rawPts.length / 25));
        for (let i = 0; i < rawPts.length; i += step) {
          bounds.extend(new googleMaps.LatLng(rawPts[i][0], rawPts[i][1]));
        }

        if (hasPoints && !bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 45, bottom: 45, left: 35, right: 35 });
        }
      }
    }
  }, [pickupLocation, dropLocation, stopsLocations, availableRoutes, selectedRouteId, engine, isLiveTracking, trackingProgress, liveSpeed, isFollowingVehicle]);

  // 5. Handle GPS Centering
  const handleMyLocationClick = async () => {
    setIsLoadingGps(true);
    try {
      const gpsPos = await getCurrentDeviceLocationGoogle();

      if (engine === 'google' && mapInstanceRef.current && window.google?.maps) {
        const googleMaps = window.google.maps;
        const pos = new googleMaps.LatLng(gpsPos.lat, gpsPos.lng);

        if (!userGpsMarkerRef.current) {
          userGpsMarkerRef.current = new googleMaps.Marker({
            position: pos,
            map: mapInstanceRef.current,
            title: 'Your Current Location',
            icon: {
              path: googleMaps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#3b82f6',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5
            }
          });
        } else {
          userGpsMarkerRef.current.setPosition(pos);
        }

        mapInstanceRef.current.panTo(pos);
        mapInstanceRef.current.setZoom(15);
      } else if (leafletMapRef.current && window.L) {
        const L = window.L;
        if (!userGpsMarkerRef.current) {
          const userIcon = L.divIcon({
            className: 'custom-gps-pin',
            html: `<div style="background:#3b82f6; color:#fff; width:26px; height:26px; border-radius:50%; border:3px solid #fff; font-weight:900; font-size:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 0 14px rgba(59,130,246,0.9);">📍</div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          userGpsMarkerRef.current = L.marker([gpsPos.lat, gpsPos.lng], { icon: userIcon }).addTo(leafletMapRef.current);
        } else {
          userGpsMarkerRef.current.setLatLng([gpsPos.lat, gpsPos.lng]);
        }
        leafletMapRef.current.panTo([gpsPos.lat, gpsPos.lng]);
        leafletMapRef.current.setZoom(15);
      }
    } catch (err) {
      console.warn('GPS location request notice:', err);
    } finally {
      setIsLoadingGps(false);
    }
  };

  // Zoom Controls
  const handleZoom = (delta) => {
    if (engine === 'google' && mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom() || 11;
      mapInstanceRef.current.setZoom(currentZoom + delta);
    } else if (leafletMapRef.current) {
      const z = leafletMapRef.current.getZoom() || 11;
      leafletMapRef.current.setZoom(z + delta);
    }
  };

  // Recenter whole route
  const handleFitEntireRoute = () => {
    setIsFollowingVehicle(false);
    if (engine === 'leaflet' && leafletMapRef.current) {
      const bounds = [];
      if (pickupLocation?.lat) bounds.push([Number(pickupLocation.lat), Number(pickupLocation.lng)]);
      (stopsLocations || []).forEach(s => { if (s?.lat) bounds.push([Number(s.lat), Number(s.lng)]); });
      if (dropLocation?.lat) bounds.push([Number(dropLocation.lat), Number(dropLocation.lng)]);
      if (bounds.length >= 2) {
        leafletMapRef.current.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 14 });
      }
    }
  };

  return (
    <div 
      className={`relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col ${className}`}
      style={{ isolation: 'isolate', zIndex: 0 }}
    >
      
      {/* Live Map Canvas Container */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: '260px' }}>
        
        {/* Map DOM Element with explicit style */}
        <div 
          ref={mapContainerRef} 
          className={`w-full ${height} bg-slate-100`}
          style={{ width: '100%', height: '270px', minHeight: '270px', position: 'relative' }} 
        />

        {/* Top Floating Controls Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-20">
          
          {/* Active Mode Pill (Only shown when Live Tracking is active to avoid clutter) */}
          {isLiveTracking ? (
            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                <span>Live GPS</span>
              </span>
            </div>
          ) : <div />}

          {/* Controls: MAP | SATELLITE Toggle Switch */}
          <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-md ml-auto">
            <button
              type="button"
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-0.5 rounded-xl text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                mapType === 'roadmap'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              <span>MAP</span>
            </button>
            
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2 py-0.5 rounded-xl text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                mapType === 'satellite'
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>SATELLITE</span>
            </button>
          </div>

        </div>

        {/* Live Tracking Quick Action Floating Bar (Bottom-Left) */}
        {isLiveTracking && (
          <div className="absolute left-3 bottom-3 flex items-center gap-1.5 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsFollowingVehicle(prev => !prev)}
              className={`px-2.5 py-1.5 rounded-xl border text-[10px] font-black backdrop-blur-md shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                isFollowingVehicle
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20'
                  : 'bg-white/95 text-slate-700 border-slate-200 hover:text-slate-900'
              }`}
            >
              <Navigation className={`w-3 h-3 ${isFollowingVehicle ? 'animate-bounce' : ''}`} />
              <span>{isFollowingVehicle ? '🎯 Tracking Cab' : '🎯 Follow Cab'}</span>
            </button>

            <button
              type="button"
              onClick={handleFitEntireRoute}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white/95 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[10px] font-black backdrop-blur-md shadow-md flex items-center gap-1 transition active:scale-95 cursor-pointer"
            >
              <RouteIcon className="w-3 h-3" />
              <span>Whole Route</span>
            </button>
          </div>
        )}

        {/* Right-Side Map Controls: ＋, −, ◎ My Location */}
        <div className="absolute right-3 top-12 flex flex-col gap-1.5 z-20">
          {/* ◎ My Location Button */}
          <button
            type="button"
            onClick={handleMyLocationClick}
            disabled={isLoadingGps}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-orange-600 hover:text-orange-700 flex items-center justify-center shadow-md backdrop-blur-md active:scale-95 transition cursor-pointer"
            title="◎ My Current Location"
          >
            <Crosshair className={`w-4 h-4 ${isLoadingGps ? 'animate-spin' : ''}`} />
          </button>

          {/* ＋ Zoom In */}
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shadow-md backdrop-blur-md active:scale-95 transition cursor-pointer"
            title="Zoom In (＋)"
          >
            ＋
          </button>

          {/* − Zoom Out */}
          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-black text-sm flex items-center justify-center shadow-md backdrop-blur-md active:scale-95 transition cursor-pointer"
            title="Zoom Out (−)"
          >
            −
          </button>
        </div>

      </div>

      {/* Optional HUD Summary Bar */}
      {showHud && (
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between divide-x divide-slate-100 text-center z-10 relative">
          <div className="flex-1 px-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Road Distance</p>
            <p className="text-sm font-black text-slate-900">{distanceKm} KM</p>
          </div>

          <div className="flex-1 px-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Est. Travel Time</p>
            <p className="text-sm font-black text-amber-600 flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{duration}</span>
            </p>
          </div>

          <div className="flex-1 px-2">
            <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Route Type</p>
            <p className="text-xs font-black text-emerald-600 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>NH Highway</span>
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
