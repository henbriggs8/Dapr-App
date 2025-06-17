import React, { useRef, useEffect, useState } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';

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

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (!window.google?.maps?.Geocoder) {
          setIsLoading(false);
          return;
        }

        const geocoder = new window.google.maps.Geocoder();
        
        try {
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              setIsLoading(false);
              
              if (status === 'OK' && results && results[0]) {
                const address = results[0].formatted_address;
                onChange(address);
                
                if (onLocationSelect) {
                  onLocationSelect({
                    lat: latitude,
                    lng: longitude,
                    address,
                  });
                }
              }
            }
          );
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        console.error('Error getting location:', error);
        alert('Could not get your current location. Please enter your address manually.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
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
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          className="h-14 px-4 pr-24 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
          autoComplete="off"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          )}
          
          <button
            type="button"
            onClick={getCurrentLocation}
            className="p-2 text-gray-400 hover:text-[#8c52ff] transition-colors"
            title="Use current location"
            disabled={isLoading}
          >
            <MapPin className="h-4 w-4" />
          </button>
        </div>
      </div>

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