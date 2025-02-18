import { useEffect, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
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
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

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
    >
      {providers.map((provider) => (
        provider.latitude && provider.longitude ? (
          <Marker
            key={provider.id}
            position={{ lat: provider.latitude, lng: provider.longitude }}
            title={provider.name || `Provider #${provider.id}`}
            animation={selectedProvider?.id === provider.id ? google.maps.Animation.BOUNCE : undefined}
          />
        ) : null
      ))}
    </GoogleMap>
  );
}
