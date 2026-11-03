import cds from "@sap/cds";

const OPENWEATHER_URL = process.env.OPENWEATHER_URL || "https://api.openweathermap.org";

export default cds.service.impl(function () {

    this.on("getWeatherAlert", async (req) => {

        const alertId = req.data.alertId?.trim();

        if (!alertId) {
            return req.reject(400, "Please provide a valid weather alert ID.");
        }

        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return req.reject(500, "OpenWeather API key is not configured.");
        }

        try {
            const query = new URLSearchParams({ appid: apiKey });
            const response = await fetch(
                `${OPENWEATHER_URL}/data/4.0/onecall/alert/${encodeURIComponent(alertId)}?${query}`,
                { signal: AbortSignal.timeout(15000) }
            );

            if (!response.ok) {
                throw Object.assign(new Error(`OpenWeather responded ${response.status}`), { status: response.status });
            }

            const data = await response.json();

            return {
                id: data.id,
                senderName: data.sender_name,
                event: data.event,
                startTime: data.start ? new Date(data.start * 1000).toISOString() : null,
                endTime: data.end ? new Date(data.end * 1000).toISOString() : null,
                descriptions: (data.description || []).map(item => ({
                    language: item.language,
                    description: item.description
                })),
                tags: data.tags || []
            };

        } catch (error) {

            cds.log("weather-alert").error("Weather Alert API Error:", error.message);

            if (error.status === 401) {
                return req.reject(502, "Invalid OpenWeather API key or subscription.");
            }

            if (error.status === 404) {
                return req.reject(404, "Weather alert not found.");
            }

            if (error.status === 429) {
                return req.reject(503, "Weather API request limit exceeded.");
            }

            return req.reject(502, "Unable to retrieve weather alert details.");
        }
    });

});
