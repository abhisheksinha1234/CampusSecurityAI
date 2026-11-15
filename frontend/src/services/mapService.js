/**
 * Google Maps Platform Loader and Spatial Utilities for Lovely Professional University.
 */

import { Loader } from '@googlemaps/js-api-loader';

// Real LPU Coordinates (NH-44 Phagwara, Punjab, India)
export const LPU_CENTER = {
  lat: 31.2530,
  lng: 75.7045,
};

export const LPU_BOUNDS = {
  north: 31.2650,
  south: 31.2420,
  east: 75.7180,
  west: 75.6950,
};

let googleMapsPromise = null;

export const getStoredApiKey = () => {
  return localStorage.getItem('lpu_google_maps_api_key') || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
};

export const setStoredApiKey = (key) => {
  if (key) {
    localStorage.setItem('lpu_google_maps_api_key', key.trim());
  } else {
    localStorage.removeItem('lpu_google_maps_api_key');
  }
  googleMapsPromise = null; // Reset loader promise
};

export const loadGoogleMaps = async () => {
  const apiKey = getStoredApiKey();

  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY' || apiKey.trim() === '') {
    console.info('[Google Maps] No API key detected. Using high-resolution LPU Satellite Canvas.');
    return null;
  }

  if (!googleMapsPromise) {
    const loader = new Loader({
      apiKey: apiKey.trim(),
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });
    googleMapsPromise = loader.load().catch((err) => {
      console.error('[Google Maps] Failed to load Google Maps SDK:', err);
      return null;
    });
  }

  return googleMapsPromise;
};
