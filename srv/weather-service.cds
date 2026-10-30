
service WeatherService {
    type CurrentWeather {
        city        : String;
        country     : String;
        temperature : Decimal;
        feelsLike   : Decimal;
        humidity    : Integer;
        description : String;
        windSpeed   : Decimal;
    }

    function getCurrentWeather(city: String) returns CurrentWeather;
}
