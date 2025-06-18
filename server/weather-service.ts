export interface WeatherData {
  current: {
    temp: number;
    humidity: number;
    weather: string;
    description: string;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    temp: number;
    weather: string;
    precipitation: number;
    description: string;
  }>;
}

export interface WeatherRecommendation {
  priority: 'high' | 'medium' | 'low';
  service: string;
  reason: string;
  timing: string;
  weatherCondition: string;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
  }

  async getCurrentWeather(lat: number, lon: number): Promise<WeatherData | null> {
    if (!this.apiKey) {
      console.warn('OpenWeather API key not configured');
      return null;
    }

    try {
      // Get current weather
      const currentResponse = await fetch(
        `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`
      );
      
      if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status}`);
      }
      
      const currentData = await currentResponse.json();

      // Get 5-day forecast
      const forecastResponse = await fetch(
        `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=imperial`
      );
      
      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status}`);
      }
      
      const forecastData = await forecastResponse.json();

      return {
        current: {
          temp: Math.round(currentData.main.temp),
          humidity: currentData.main.humidity,
          weather: currentData.weather[0].main,
          description: currentData.weather[0].description,
          windSpeed: currentData.wind.speed
        },
        forecast: this.processForecast(forecastData.list)
      };
    } catch (error) {
      console.error('Weather service error:', error);
      return null;
    }
  }

  private processForecast(forecastList: any[]): Array<{
    date: string;
    temp: number;
    weather: string;
    precipitation: number;
    description: string;
  }> {
    const dailyData = new Map();
    
    forecastList.forEach(item => {
      const date = new Date(item.dt * 1000).toISOString().split('T')[0];
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          date,
          temp: Math.round(item.main.temp),
          weather: item.weather[0].main,
          precipitation: (item.rain?.['3h'] || 0) + (item.snow?.['3h'] || 0),
          description: item.weather[0].description
        });
      }
    });

    return Array.from(dailyData.values()).slice(0, 5);
  }

  generateServiceRecommendations(weather: WeatherData): WeatherRecommendation[] {
    const recommendations: WeatherRecommendation[] = [];
    const { current, forecast } = weather;

    // Check if rain is coming in next 2 days
    const rainForecast = forecast.slice(0, 2).find(day => 
      day.weather.toLowerCase().includes('rain') || day.precipitation > 0.1
    );

    if (rainForecast && current.weather !== 'Rain') {
      recommendations.push({
        priority: 'high',
        service: 'Basic',
        reason: `Rain expected ${rainForecast.date === forecast[0].date ? 'tomorrow' : 'in 2 days'}. Get your car washed now to protect from water spots.`,
        timing: 'Book today',
        weatherCondition: 'rain_coming'
      });
    }

    // Current rain - suggest interior cleaning
    if (current.weather === 'Rain' || current.weather === 'Drizzle') {
      recommendations.push({
        priority: 'medium',
        service: 'The OG',
        reason: 'Rainy weather is perfect for interior detailing. No outdoor washing needed.',
        timing: 'Book now',
        weatherCondition: 'raining'
      });
    }

    // High humidity - mold prevention
    if (current.humidity > 80) {
      recommendations.push({
        priority: 'medium',
        service: 'Black Label',
        reason: 'High humidity can cause mold and mildew. Deep interior cleaning recommended.',
        timing: 'This week',
        weatherCondition: 'high_humidity'
      });
    }

    // Hot sunny weather - protect paint
    if (current.temp > 85 && current.weather === 'Clear') {
      recommendations.push({
        priority: 'medium',
        service: 'Black Label',
        reason: 'Hot sunny weather can damage paint. Premium wax protection recommended.',
        timing: 'Next few days',
        weatherCondition: 'hot_sunny'
      });
    }

    // Windy conditions - dust accumulation
    if (current.windSpeed > 15) {
      recommendations.push({
        priority: 'low',
        service: 'Basic',
        reason: 'Windy conditions cause dust buildup. Regular wash maintains your car\'s appearance.',
        timing: 'This week',
        weatherCondition: 'windy'
      });
    }

    // Snow/winter conditions
    if (current.weather === 'Snow' || current.temp < 32) {
      recommendations.push({
        priority: 'high',
        service: 'The OG',
        reason: 'Winter conditions require salt removal and undercarriage cleaning.',
        timing: 'Book soon',
        weatherCondition: 'winter'
      });
    }

    // Perfect weather for exterior wash
    if (current.temp >= 65 && current.temp <= 80 && current.weather === 'Clear' && current.windSpeed < 10) {
      recommendations.push({
        priority: 'low',
        service: 'Basic',
        reason: 'Perfect weather conditions for an exterior wash and detail.',
        timing: 'Great time to book',
        weatherCondition: 'perfect'
      });
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  async getServiceRecommendations(lat: number, lon: number): Promise<WeatherRecommendation[]> {
    const weather = await this.getCurrentWeather(lat, lon);
    
    if (!weather) {
      // Return generic recommendations if weather data unavailable
      return [
        {
          priority: 'medium',
          service: 'Basic',
          reason: 'Regular maintenance keeps your car looking great.',
          timing: 'Book anytime',
          weatherCondition: 'unknown'
        }
      ];
    }

    return this.generateServiceRecommendations(weather);
  }
}

export const weatherService = new WeatherService();