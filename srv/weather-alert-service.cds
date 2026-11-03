
service WeatherAlertService {

    type AlertDescription {
        language    : String;
        description : LargeString;
    }

    type WeatherAlert {
        id          : String;
        senderName  : String;
        event       : String;
        startTime   : String;
        endTime     : String;
        descriptions: many AlertDescription;
        tags        : many String;
    }

    function getWeatherAlert(
        alertId : String
    ) returns WeatherAlert;
}
