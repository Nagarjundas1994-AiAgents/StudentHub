
import cds from "@sap/cds";
import { executeHttpRequest } from "@sap-cloud-sdk/http-client";

const DESTINATION_NAME = "WEATHER_API";

export default cds.service.impl(function () {

    this.on("getWeatherAlert", async (req) => {

        const alertId = req.data.alertId?.trim();

        // Validate alert ID
        if (!alertId) {
            return req.reject(
                400,
                "Please provide a valid weather alert ID."
            );
        }

        // Read API key securely
        const apiKey = process.env.OPENWEATHER_API_KEY;

        if (!apiKey) {
            return req.reject(
                500,
                "OpenWeather API key is not configured."
            );
        }

        try {

            // Consume OpenWeather Alert API through BTP Destination
            const response = await executeHttpRequest(
                {
                    destinationName: DESTINATION_NAME
                },
                {
                    method: "GET",

                    url: `/data/4.0/onecall/alert/${encodeURIComponent(alertId)}`,

                    params: {
                        appid: apiKey
                    },

                    timeout: 15000
                }
            );

            const data = response.data;

            // Map API response to CAP structure
            return {
                id: data.id,
                senderName: data.sender_name,
                event: data.event,

                startTime: data.start
                    ? new Date(data.start * 1000).toISOString()
                    : null,

                endTime: data.end
                    ? new Date(data.end * 1000).toISOString()
                    : null,

                descriptions: (data.description || []).map(
                    item => ({
                        language: item.language,
                        description: item.description
                    })
                ),

                tags: data.tags || []
            };

        } catch (error) {

            const status = error.response?.status;

            console.error(
                "Weather Alert API Error:",
                error.message
            );

            if (status === 401) {
                return req.reject(
                    502,
                    "Invalid OpenWeather API key or subscription."
                );
            }

            if (status === 404) {
                return req.reject(
                    404,
                    "Weather alert not found."
                );
            }

            if (status === 429) {
                return req.reject(
                    503,
                    "Weather API request limit exceeded."
                );
            }

            return req.reject(
                502,
                "Unable to retrieve weather alert details."
            );
        }
    });

});
