
import cds from "@sap/cds";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";

export default cds.service.impl(function () {

    this.on("getCurrentWeather", async (req) => {

        const city = req.data.city?.trim();

        if (!city) {
            return req.reject(400, "Please provide a city name.");
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return req.reject(500, "Weather API key is not configured.");
        }

        try {
            const response = await executeHttpRequest(
                {
                    destinationName: "WEATHER_API"
                },
                {
                    method: "GET",
                    url: "/data/2.5/weather",
                    params: {
                        q: city,
                        appid: apiKey,
                        units: "metric"
                    },
                    timeout: 10000
                }
            );

            const data = response.data;

            return {
                city: data.name,
                country: data.sys?.country,
                temperature: data.main.temp,
                feelsLike: data.main.feels_like,
                humidity: data.main.humidity,
                description: data.weather?.[0]?.description,
                windSpeed: data.wind?.speed
            };

        } catch (error) {

            console.error("Weather API error:", error.message);

            if (error.response?.status === 404) {
                return req.reject(404, "City not found.");
            }

            if (error.response?.status === 401) {
                return req.reject(502, "Invalid Weather API key.");
            }

            return req.reject(502, "Unable to retrieve weather information.");
        }
    });

});
