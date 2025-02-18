import { useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";
import { User } from "@shared/schema";
import { Loader2 } from "lucide-react";

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

interface MapComponentProps {
  providers?: User[];
  center?: { lat: number; lng: number };
  zoom?: number;
  selectedProvider?: User;
}

export default function MapComponent({ 
  providers = [], 
  center = defaultCenter,
  zoom = 12,
  selectedProvider
}: MapComponentProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["marker"]
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!map || !providers.length) return;

    // Clear existing markers
    map.getDiv().querySelectorAll('.advanced-marker').forEach(el => el.remove());

    // Add markers for each provider
    providers.forEach(provider => {
      if (!provider.latitude || !provider.longitude) return;

      const position = { lat: provider.latitude, lng: provider.longitude };

      // Create the marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'advanced-marker';
      markerElement.style.backgroundColor = selectedProvider?.id === provider.id ? '#3b82f6' : '#6b7280';
      markerElement.style.borderRadius = '50%';
      markerElement.style.padding = '8px';
      markerElement.style.border = '2px solid white';

      // Create and add the advanced marker
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position,
        map,
        title: provider.name || `Provider #${provider.id}`,
        content: markerElement
      });
    });
  }, [map, providers, selectedProvider]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      onLoad={setMap}
    >
    </GoogleMap>
  );
}