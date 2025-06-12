import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function AddressScreen() {
  const [, setLocation] = useLocation();
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");

  const handleSaveAndContinue = () => {
    // Save address data to localStorage for now
    const addressData = {
      streetAddress,
      city,
      state,
      zipCode
    };
    localStorage.setItem("userAddress", JSON.stringify(addressData));
    
    // Navigate to car profile screen
    setLocation("/onboarding/car-profile");
  };

  const isFormValid = streetAddress && city && state && zipCode;

  return (
    <div className="min-h-screen bg-white px-4 pt-12 pb-8">
      {/* Header */}
      <div className="flex items-center mb-8">
        <button
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
        >
          <ArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-xl font-semibold text-gray-900 ml-4">
          Service Address
        </h1>
      </div>

      {/* Icon and Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 bg-[#8c52ff]/10 rounded-full mb-4">
          <MapPin className="h-8 w-8 text-[#8c52ff]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Where should we send your detailer?
        </h2>
        <p className="text-gray-600 text-base">
          We'll send a professional detailer to your location
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        {/* Street Address */}
        <div className="space-y-2">
          <Label htmlFor="street" className="text-sm font-medium text-gray-700">
            Street Address
          </Label>
          <Input
            id="street"
            type="text"
            placeholder="123 Main Street"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
          />
        </div>

        {/* City */}
        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
            City
          </Label>
          <Input
            id="city"
            type="text"
            placeholder="San Francisco"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
          />
        </div>

        {/* State and ZIP Code */}
        <div className="grid grid-cols-5 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="state" className="text-sm font-medium text-gray-700">
              State
            </Label>
            <Select onValueChange={setState} value={state}>
              <SelectTrigger className="h-14 border-gray-300 focus:ring-[#8c52ff] focus:border-transparent">
                <SelectValue placeholder="CA" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((stateCode) => (
                  <SelectItem key={stateCode} value={stateCode}>
                    {stateCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="col-span-3 space-y-2">
            <Label htmlFor="zip" className="text-sm font-medium text-gray-700">
              ZIP Code
            </Label>
            <Input
              id="zip"
              type="text"
              placeholder="94102"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className="h-14 px-4 text-base border-gray-300 focus:ring-[#8c52ff] focus:border-transparent"
            />
          </div>
        </div>

        {/* Save & Continue Button */}
        <div className="pt-4">
          <Button
            onClick={handleSaveAndContinue}
            disabled={!isFormValid}
            className="w-full h-14 text-base font-semibold bg-[#8c52ff] hover:bg-[#7c47eb] disabled:bg-gray-300 disabled:text-gray-500 rounded-lg"
          >
            Save & Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
}