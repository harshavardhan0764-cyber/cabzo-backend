import { loadGoogleMaps } from './googleMapsLoader';
import { INDIA_POPULAR_PLACES, searchPlaces as fallbackSearchPlaces, reverseGeocode as fallbackReverseGeocode } from './locationService';

let autocompleteServiceInstance = null;
let geocoderInstance = null;
let placesServiceInstance = null;

async function getGoogleServices() {
  try {
    const googleMaps = await loadGoogleMaps();
    if (!googleMaps) return null;

    if (!autocompleteServiceInstance && googleMaps.places) {
      autocompleteServiceInstance = new googleMaps.places.AutocompleteService();
    }
    if (!geocoderInstance) {
      geocoderInstance = new googleMaps.Geocoder();
    }
    if (!placesServiceInstance && googleMaps.places) {
      const dummyDiv = document.createElement('div');
      placesServiceInstance = new googleMaps.places.PlacesService(dummyDiv);
    }

    return {
      google: window.google,
      autocompleteService: autocompleteServiceInstance,
      geocoder: geocoderInstance,
      placesService: placesServiceInstance
    };
  } catch {
    return null;
  }
}

/**
 * Categorize place type based on Google types
 */
function getPlaceCategory(types = []) {
  if (types.includes('airport')) return 'airport';
  if (types.includes('train_station') || types.includes('transit_station')) return 'train';
  if (types.includes('tourist_attraction') || types.includes('point_of_interest') || types.includes('museum')) return 'tourist';
  if (types.includes('lodging') || types.includes('hotel')) return 'hotel';
  if (types.includes('locality') || types.includes('sublocality')) return 'city';
  return 'geo';
}

/**
 * Search locations across India using Google Places Autocomplete API
 */
export async function searchGooglePlaces(query) {
  if (!query || !query.trim()) {
    return INDIA_POPULAR_PLACES.slice(0, 8);
  }

  const cleanQuery = query.trim();

  try {
    const services = await getGoogleServices();
    if (services && services.autocompleteService) {
      const response = await new Promise((resolve) => {
        services.autocompleteService.getPlacePredictions(
          {
            input: cleanQuery,
            componentRestrictions: { country: 'in' },
            types: ['geocode', 'establishment']
          },
          (predictions, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          }
        );
      });

      if (response && response.length > 0) {
        return response.map((p) => {
          const mainText = p.structured_formatting?.main_text || p.description.split(',')[0];
          const secondaryText = p.structured_formatting?.secondary_text || p.description;
          const category = getPlaceCategory(p.types || []);

          return {
            name: mainText,
            address: p.description,
            placeId: p.place_id,
            city: secondaryText.split(',')[0]?.trim() || mainText,
            state: secondaryText.split(',')[1]?.trim() || 'India',
            type: p.types?.[0]?.replace(/_/g, ' ') || 'Place',
            category,
            isGooglePlace: true
          };
        });
      }
    }
  } catch (err) {
    console.warn('Google Places Autocomplete fallback:', err.message);
  }

  // Fallback to local verified places + geocoding database
  return fallbackSearchPlaces(cleanQuery);
}

/**
 * Fetch detailed geometry (lat, lng) and address for a Google Place ID
 */
export async function getPlaceDetails(placeItem) {
  if (!placeItem) return null;

  // If already has lat/lng, return immediately
  if (placeItem.lat && placeItem.lng) {
    return placeItem;
  }

  if (placeItem.placeId) {
    try {
      const services = await getGoogleServices();
      if (services && (services.placesService || services.geocoder)) {
        if (services.placesService) {
          const details = await new Promise((resolve) => {
            services.placesService.getDetails(
              {
                placeId: placeItem.placeId,
                fields: ['name', 'formatted_address', 'geometry', 'place_id', 'address_components']
              },
              (result, status) => {
                if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
                  resolve(result);
                } else {
                  resolve(null);
                }
              }
            );
          });

          if (details && details.geometry && details.geometry.location) {
            const lat = details.geometry.location.lat();
            const lng = details.geometry.location.lng();
            let city = placeItem.city || details.name;
            let state = placeItem.state || 'India';

            if (details.address_components) {
              const locality = details.address_components.find(c => c.types.includes('locality'));
              const adminArea = details.address_components.find(c => c.types.includes('administrative_area_level_1'));
              if (locality) city = locality.long_name;
              if (adminArea) state = adminArea.long_name;
            }

            return {
              name: details.name || placeItem.name,
              address: details.formatted_address || placeItem.address,
              lat,
              lng,
              placeId: details.place_id || placeItem.placeId,
              city,
              state,
              category: placeItem.category || 'geo'
            };
          }
        }

        // Geocoder fallback by place ID
        if (services.geocoder) {
          const geoRes = await services.geocoder.geocode({ placeId: placeItem.placeId });
          if (geoRes && geoRes.results && geoRes.results[0]) {
            const res = geoRes.results[0];
            return {
              name: placeItem.name,
              address: res.formatted_address,
              lat: res.geometry.location.lat(),
              lng: res.geometry.location.lng(),
              placeId: placeItem.placeId,
              city: placeItem.city || 'India',
              state: placeItem.state || 'India',
              category: placeItem.category || 'geo'
            };
          }
        }
      }
    } catch (err) {
      console.warn('Place details fetch fallback:', err.message);
    }
  }

  // Fallback search in local database
  const localMatch = INDIA_POPULAR_PLACES.find(p => 
    p.name.toLowerCase().includes(placeItem.name?.toLowerCase()) ||
    (placeItem.address && p.address.toLowerCase().includes(placeItem.address.toLowerCase()))
  );

  if (localMatch) {
    return {
      ...placeItem,
      lat: localMatch.lat,
      lng: localMatch.lng,
      city: localMatch.city,
      state: localMatch.state
    };
  }

  return {
    ...placeItem,
    lat: placeItem.lat || 12.9716,
    lng: placeItem.lng || 77.5946
  };
}

/**
 * Reverse geocode coordinates to Google Place / Address
 */
export async function reverseGeocodeGoogle(lat, lng) {
  try {
    const services = await getGoogleServices();
    if (services && services.geocoder) {
      const response = await services.geocoder.geocode({
        location: { lat, lng }
      });

      if (response && response.results && response.results.length > 0) {
        const topResult = response.results[0];
        let name = 'Selected Location';
        let city = 'Karnataka';
        let state = 'India';

        if (topResult.address_components) {
          const premise = topResult.address_components.find(c => c.types.includes('premise') || c.types.includes('point_of_interest') || c.types.includes('establishment'));
          const locality = topResult.address_components.find(c => c.types.includes('locality') || c.types.includes('sublocality_level_1'));
          const adminArea = topResult.address_components.find(c => c.types.includes('administrative_area_level_1'));

          if (premise) name = premise.long_name;
          else if (locality) name = locality.long_name;
          else name = topResult.formatted_address.split(',')[0];

          if (locality) city = locality.long_name;
          if (adminArea) state = adminArea.long_name;
        }

        return {
          name,
          address: topResult.formatted_address,
          lat,
          lng,
          placeId: topResult.place_id,
          city,
          state
        };
      }
    }
  } catch (err) {
    console.warn('Google reverse geocode fallback:', err.message);
  }

  // Fallback to local reverse geocoder
  return fallbackReverseGeocode(lat, lng);
}

/**
 * Detect user's current GPS location with high accuracy and smart fallback
 */
export function getCurrentDeviceLocationGoogle() {
  return new Promise((resolve) => {
    // Validate if coordinates fall within Indian geographical boundary
    // India latitude bounds: ~8.0° N to ~37.5° N, longitude bounds: ~68.0° E to ~97.5° E
    const isInsideIndia = (lat, lng) => {
      return (
        typeof lat === 'number' &&
        typeof lng === 'number' &&
        lat >= 8.0 && lat <= 37.5 &&
        lng >= 68.0 && lng <= 97.5
      );
    };

    // Helper to reverse geocode and resolve
    const finishWithCoords = async (latitude, longitude, isGps = true) => {
      // If detected position is outside India (e.g. cloud VPN or emulator proxy), fallback to Bengaluru
      if (!isInsideIndia(latitude, longitude)) {
        console.warn(`[GPS] Detected coordinates (${latitude}, ${longitude}) outside India. Defaulting to Indian hub.`);
        resolveIndianFallback();
        return;
      }

      try {
        const place = await reverseGeocodeGoogle(latitude, longitude);
        if (place && isInsideIndia(place.lat, place.lng)) {
          resolve({
            ...place,
            lat: latitude,
            lng: longitude,
            isGps
          });
          return;
        }
      } catch (_) {}

      // Fallback nearest Indian place from our 500+ Indian database
      const localMatch = INDIA_POPULAR_PLACES.find(p => {
        const dLat = Math.abs(p.lat - latitude);
        const dLng = Math.abs(p.lng - longitude);
        return dLat < 0.3 && dLng < 0.3;
      });

      if (localMatch) {
        resolve({
          ...localMatch,
          lat: latitude,
          lng: longitude,
          isGps
        });
      } else {
        resolveIndianFallback();
      }
    };

    // Indian fallback default location (Bengaluru MG Road)
    const resolveIndianFallback = () => {
      resolve({
        name: 'Bengaluru (MG Road)',
        address: 'MG Road, Bengaluru, Karnataka 560001, India',
        city: 'Bengaluru',
        state: 'Karnataka',
        lat: 12.9716,
        lng: 77.5946,
        isFallback: true
      });
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolveIndianFallback();
      return;
    }

    // Try high accuracy first
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await finishWithCoords(latitude, longitude, true);
      },
      (errHigh) => {
        console.warn('GPS High accuracy timeout/error, trying standard accuracy...', errHigh.message);
        // Fallback to low-power standard accuracy
        navigator.geolocation.getCurrentPosition(
          async (posLow) => {
            const { latitude, longitude } = posLow.coords;
            await finishWithCoords(latitude, longitude, true);
          },
          (errLow) => {
            console.warn('GPS Standard accuracy failed, defaulting to Indian hub...', errLow.message);
            resolveIndianFallback();
          },
          { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      },
      { timeout: 7000, enableHighAccuracy: true, maximumAge: 10000 }
    );
  });
}
