import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Cloud, Sun, CloudRain, Thermometer, Droplets, Wind, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface WeatherRecommendation {
  priority: 'high' | 'medium' | 'low';
  service: string;
  reason: string;
  timing: string;
  weatherCondition: string;
}

interface WeatherRecommendationsProps {
  latitude?: number;
  longitude?: number;
  onServiceSelect?: (serviceName: string) => void;
}

export default function WeatherRecommendations({ 
  latitude, 
  longitude, 
  onServiceSelect 
}: WeatherRecommendationsProps) {
  // Fetch weather recommendations
  const { data: recommendations, isLoading } = useQuery<WeatherRecommendation[]>({
    queryKey: ['/api/weather/recommendations', latitude, longitude],
    queryFn: async () => {
      if (!latitude || !longitude) return [];
      const res = await fetch(`/api/weather/recommendations?lat=${latitude}&lon=${longitude}`);
      if (!res.ok) throw new Error('Failed to fetch weather recommendations');
      return res.json();
    },
    enabled: !!latitude && !!longitude,
    refetchInterval: 1800000, // Refresh every 30 minutes
  });

  // Fetch current weather for display
  const { data: weather } = useQuery({
    queryKey: ['/api/weather/current', latitude, longitude],
    queryFn: async () => {
      if (!latitude || !longitude) return null;
      const res = await fetch(`/api/weather/current?lat=${latitude}&lon=${longitude}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!latitude && !!longitude,
    refetchInterval: 1800000,
  });

  const getWeatherIcon = (condition: string) => {
    const lower = condition.toLowerCase();
    if (lower.includes('rain') || lower.includes('drizzle')) return <CloudRain className="h-5 w-5" />;
    if (lower.includes('cloud')) return <Cloud className="h-5 w-5" />;
    if (lower.includes('clear') || lower.includes('sun')) return <Sun className="h-5 w-5" />;
    return <Cloud className="h-5 w-5" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 animate-pulse" />
            Weather Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8c52ff]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {weather && getWeatherIcon(weather.current.weather)}
            Weather-Based Recommendations
          </CardTitle>
          {weather && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Thermometer className="h-4 w-4" />
                {weather.current.temp}°F
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="h-4 w-4" />
                {weather.current.humidity}%
              </div>
              <div className="flex items-center gap-1">
                <Wind className="h-4 w-4" />
                {Math.round(weather.current.windSpeed)} mph
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-start gap-3 p-4 bg-white rounded-lg border border-gray-100"
            >
              <div className="flex-shrink-0">
                <Badge 
                  variant="outline" 
                  className={`${getPriorityColor(rec.priority)} flex items-center gap-1`}
                >
                  {getPriorityIcon(rec.priority)}
                  {rec.priority.charAt(0).toUpperCase() + rec.priority.slice(1)}
                </Badge>
              </div>
              
              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">{rec.service} Service</h4>
                  <span className="text-xs text-[#8c52ff] font-medium">{rec.timing}</span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{rec.reason}</p>
                
                {onServiceSelect && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onServiceSelect(rec.service)}
                    className="border-[#8c52ff] text-[#8c52ff] hover:bg-[#8c52ff] hover:text-white"
                  >
                    Book {rec.service}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          
          {weather && weather.forecast && weather.forecast.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">5-Day Forecast</h4>
              <div className="grid grid-cols-5 gap-2">
                {weather.forecast.map((day, index) => (
                  <div key={index} className="text-center p-2 bg-white rounded border">
                    <div className="text-xs text-gray-500 mb-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="flex justify-center mb-1">
                      {getWeatherIcon(day.weather)}
                    </div>
                    <div className="text-sm font-medium">{day.temp}°</div>
                    {day.precipitation > 0 && (
                      <div className="text-xs text-blue-600">
                        {day.precipitation.toFixed(1)}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}