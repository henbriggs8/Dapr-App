import React, { useRef, useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import { Icon } from "@/components/ui/icon";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, details?: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  onLocationSelect?: (location: { lat: number; lng: number; address: string }) => void;
}

interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter your address",
  label,
  className = "",
  onLocationSelect
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Load Google Maps API with Places library
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: ["places"]
  });
  
  // Initialize Google Places Autocomplete Service
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    // Initialize Google Places services when API is loaded
    if (isLoaded && window.google && window.google.maps && window.google.maps.places) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      
      // Create a dummy div element for PlacesService
      const dummyDiv = document.createElement('div');
      placesService.current = new window.google.maps.places.PlacesService(dummyDiv);
    }
  }, [isLoaded]);

  const handleInputChange = async (inputValue: string) => {
    onChange(inputValue);
    
    if (!inputValue.trim() || inputValue.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!isLoaded || !autocompleteService.current) {
      // Fallback: still allow manual address entry
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const request = {
        input: inputValue,
        types: ['address'],
        componentRestrictions: { country: 'us' }, // Restrict to US addresses
      };

      autocompleteService.current.getPlacePredictions(request, (predictions, status) => {
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
          const formattedSuggestions = predictions.map(prediction => ({
            placeId: prediction.place_id,
            description: prediction.description,
            mainText: prediction.structured_formatting.main_text,
            secondaryText: prediction.structured_formatting.secondary_text,
          }));
          
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = async (suggestion: AddressSuggestion) => {
    if (!placesService.current) return;

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const request = {
        placeId: suggestion.placeId,
        fields: ['formatted_address', 'geometry', 'address_components', 'name'],
      };

      placesService.current.getDetails(request, (place, status) => {
        setIsLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          onChange(place.formatted_address || suggestion.description, place);
          
          if (place.geometry?.location && onLocationSelect) {
            onLocationSelect({
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || suggestion.description,
            });
          }
        }
      });
    } catch (error) {
      console.error('Error getting place details:', error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const reverseGeocodeNominatim = async (lat: number, lng: number): Promise<string> => {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) throw new Error("Nominatim reverse geocode failed");
    const data = await res.json();
    const a = data.address || {};
    const house = a.house_number || "";
    const road = a.road || a.pedestrian || a.path || "";
    const city = a.city || a.town || a.village || a.county || "";
    const state = a.state || "";
    const zip = a.postcode || "";
    const street = [house, road].filter(Boolean).join(" ");
    return [street, city, [state, zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location services are not available on this device.");
      return;
    }

    setLocationError(null);
    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          let address: string | null = null;

          // Try Google Maps Geocoder first if available
          if (window.google?.maps?.Geocoder) {
            await new Promise<void>((resolve) => {
              const geocoder = new window.google.maps.Geocoder();
              geocoder.geocode(
                { location: { lat: latitude, lng: longitude } },
                (results, status) => {
                  if (status === 'OK' && results && results[0]) {
                    address = results[0].formatted_address;
                  }
                  resolve();
                }
              );
            });
          }

          // Fall back to Nominatim (OpenStreetMap) — no API key needed
          if (!address) {
            address = await reverseGeocodeNominatim(latitude, longitude);
          }

          if (address) {
            onChange(address);
            if (onLocationSelect) {
              onLocationSelect({ lat: latitude, lng: longitude, address });
            }
          }
        } catch (error) {
          console.error("Reverse geocoding failed:", error);
          setLocationError("Got your location but could not look up the address. Please type it in.");
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        console.error("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location access denied. On iPhone, go to Settings → Privacy & Security → Location Services and enable it for Safari (or Dapper).");
        } else if (error.code === error.TIMEOUT) {
          setLocationError("Location timed out. Make sure you have a GPS signal and try again.");
        } else {
          setLocationError("Could not get your location. Please enter your address manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
    );
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <Label htmlFor="address-input" className="text-sm font-medium text-gray-700 mb-2 block">
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={inputRef}
          id="address-input"
          type="text"
          placeholder={isLoaded ? placeholder : "Enter your address manually"}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="h-14 px-4 pr-24 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
          autoComplete="off"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Icon icon={Loader2} size="sm" className="animate-spin text-gray-400" />
          )}
          
          <button
            type="button"
            onClick={getCurrentLocation}
            className="p-2 text-gray-400 hover:text-[#8c52ff] transition-colors"
            title={isLoaded ? "Use current location" : "Geolocation available"}
            disabled={isLoading}
          >
            <Icon icon={MapPin} size="sm" />
          </button>
        </div>
      </div>
      
      {locationError && (
        <div className="text-xs text-red-600 mt-1.5 leading-snug">
          {locationError}
        </div>
      )}

      {!isLoaded && !import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="text-xs text-amber-600 mt-1">
          Address autocomplete unavailable - manual entry only
        </div>
      )}

      {/* Address Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-[#8c52ff]/5 border-[#8c52ff]/20' : ''
              }`}
            >
              <div className="font-medium text-gray-900 text-sm">
                {suggestion.mainText}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                {suggestion.secondaryText}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}