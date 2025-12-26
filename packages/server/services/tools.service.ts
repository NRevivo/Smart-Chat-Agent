// Three specialized tools: weather, math calculations, and exchange rates
import { evaluate } from 'mathjs';

// Exchange rates vs ILS (update periodically)
const EXCHANGE_RATES: Record<string, number> = {
   USD: 3.75,
   EUR: 4.1,
   GBP: 4.75,
   JPY: 0.025,
   CAD: 2.7,
   AUD: 2.45,
   CHF: 4.2,
   CNY: 0.52,
   INR: 0.045,
   MXN: 0.22,
};

export const toolsService = {
   // Fetches weather from OpenWeatherMap - requires OPENWEATHER_API_KEY env var
   async getWeather(city: string): Promise<string> {
      try {
         const apiKey = process.env.OPENWEATHER_API_KEY;

         if (!apiKey) {
            return 'Error: OpenWeatherMap API key not configured. Please set OPENWEATHER_API_KEY environment variable.';
         }

         const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`
         );

         if (!response.ok) {
            if (response.status === 404) {
               return `City "${city}" not found. Please check the spelling and try again.`;
            }
            return `Error fetching weather data: ${response.statusText}`;
         }

         const data: any = await response.json();

         const temp = data.main.temp;
         const feelsLike = data.main.feels_like;
         const description = data.weather[0].description;
         const humidity = data.main.humidity;
         const windSpeed = data.wind.speed;

         return `Weather in ${data.name}, ${data.sys.country}: ${description}. Temperature: ${temp}°C (feels like ${feelsLike}°C). Humidity: ${humidity}%. Wind speed: ${windSpeed} m/s.`;
      } catch (error) {
         return `Error fetching weather: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
   },

   // Safe math evaluation using mathjs - prevents code injection
   calculateMath(expression: string): string {
      try {
         // Validate against dangerous characters
         if (/[`${}]/.test(expression)) {
            return 'Error: Invalid expression. Please use basic mathematical operations only.';
         }

         const result = evaluate(expression);

         // Handle different result types
         if (typeof result === 'number') {
            const formattedResult = Number.isInteger(result)
               ? result
               : result.toFixed(10).replace(/\.?0+$/, '');
            return `The result of ${expression} is ${formattedResult}`;
         } else if (typeof result === 'string') {
            return `The result of ${expression} is: ${result}`;
         } else {
            return `The result of ${expression} is: ${JSON.stringify(result)}`;
         }
      } catch (error) {
         return `Error calculating expression: ${error instanceof Error ? error.message : 'Invalid expression'}`;
      }
   },

   // Returns static exchange rates vs ILS
   getExchangeRate(currencyCode: string): string {
      try {
         const code = currencyCode.toUpperCase().trim();

         if (!EXCHANGE_RATES[code]) {
            const availableCurrencies = Object.keys(EXCHANGE_RATES).join(', ');
            return `Currency "${code}" not found. Available currencies: ${availableCurrencies}`;
         }

         const rate = EXCHANGE_RATES[code];
         return `1 ${code} = ${rate} ILS (Israeli Shekel)`;
      } catch (error) {
         return `Error retrieving exchange rate: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
   },
};
