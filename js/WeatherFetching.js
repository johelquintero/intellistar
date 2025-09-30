
const zipCodes = ["3101", "3103", "3105", "3150"]; // Lista de códigos postales

function getWeatherDataForZip(zipCode) {
  return fetch(`https://api.weather.com/v3/wx/forecast/daily/5day?postalKey=${zipCode}&format=json&apiKey=${CONFIG.secrets.twcAPIKey}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => data);
}

function displayWeatherData(weatherData) {
  // Aquí puedes definir cómo mostrar los datos meteorológicos en la interfaz de usuario
  console.log(weatherData); // Por ahora, solo mostramos los datos en la consola
}

let currentIndex = 0;

function guessZipCode() {
  // Skip geolookup until replaced with TWC (wunderground api dead)
  return;

}

// Comenzar a mostrar el pronóstico del tiempo para los códigos postales en bucle
guessZipCode();

function fetchAlerts(){
  var alertCrawl = "";
  fetch(`https://api.weather.gov/alerts/active?point=${latitude},${longitude}`)
    .then(function(response) {
        if (response.status !== 200) {
            console.warn("Alerts Error, no alerts will be shown");
        }
      response.json().then(function(data) {
        if (data.features == undefined){
          fetchForecast();
          return;
        }
        if (data.features.length == 1) {
          alerts[0] = data.features[0].properties.event + '<br>' + data.features[0].properties.description.replace("..."," ").replace(/\*/g, "")
          for(var i = 0; i < data.features.length; i++){
            /* Take the most important alert message and set it as crawl text
            This will supply more information i.e. tornado warning coverage */
            alertCrawl = alertCrawl + " " + data.features[i].properties.description.replace("...", " ");
          }
        }
        else {
          for(var i = 0; i < data.features.length; i++){
            /* Take the most important alert message and set it as crawl text
            This will supply more information i.e. tornado warning coverage */
            alertCrawl = alertCrawl + " " + data.features[i].properties.description.replace("...", " ");

            alerts[i] = data.features[i].properties.event
          }
        }
        if(alertCrawl != ""){
          CONFIG.crawl = alertCrawl;
        }
        alertsActive = alerts.length > 0;
        fetchForecast();
      });
    })
}

function fetchForecast(){
  fetch(`https://api.weather.com/v1/geocode/${latitude}/${longitude}/forecast/daily/10day.json?language=${CONFIG.language}&units=${CONFIG.units}&apiKey=${CONFIG.secrets.twcAPIKey}`)
    .then(function(response) {
      if (response.status !== 200) {
        console.log('forecast request error');
        return;
      }
      response.json().then(function(data) {
        let forecasts = data.forecasts
        // narratives
        isDay = forecasts[0].day; // If the API spits out a day forecast, use the day timings
        let ns = []
        ns.push(forecasts[0].day || forecasts[0].night); // there must be a day forecast so if the API doesn't provide one, just make it the night one. It won't show anyway.
        ns.push(forecasts[0].night);
        ns.push(forecasts[1].day);
        ns.push(forecasts[1].night);
        for (let i = 0; i <= 3; i++) {
          let n = ns[i]
          forecastTemp[i] = n.temp
          forecastIcon[i] = n.icon_code
          forecastNarrative[i] = n.narrative
          // FIX: More accurate translation for precipitation forecast
          const precipMap = {
              "rain": "lluvia",
              "snow": "nieve",
              "sleet": "aguanieve",
              "hail": "granizo"
          };
          const precipType = (n.precip_type || "").toLowerCase();
          const translatedPrecip = precipMap[precipType] || "precipitación";
          forecastPrecip[i] = `${n.pop}% Probabilidad de ${translatedPrecip}`;
        }
        // 7 day outlook
        for (var i = 0; i < 7; i++) {
          let fc = forecasts[i+1]
          outlookHigh[i] = fc.max_temp
          outlookLow[i] = fc.min_temp
          outlookCondition[i] = (fc.day ? fc.day : fc.night).phrase_32char.split(' ').join('<br/>')
          // thunderstorm doesn't fit in the 7 day outlook boxes
          // so I multilined it similar to that of the original
          outlookCondition[i] = outlookCondition[i].replace("Thunderstorm", "Thunder</br>storm");
          outlookIcon[i] = (fc.day ? fc.day : fc.night).icon_code
        }
        // La llamada a fetchRadarImages() se elimina, ahora se maneja en MainScript.js
        scheduleTimeline();
      })
    })
}

function fetchCurrentWeather(hasCoordinates = false) {
  const fetchWeatherByCoords = () => {
    fetch(`https://api.weather.com/v1/geocode/${latitude}/${longitude}/observations/current.json?language=${CONFIG.language}&units=${CONFIG.units}&apiKey=${CONFIG.secrets.twcAPIKey}`)
      .then(function(response) {
        if (response.status !== 200) {
          console.log("conditions request error");
          return;
        }
        response.json().then(function(data) {
          let unit = data.observation[CONFIG.unitField];
          currentTemperature = Math.round(unit.temp);
          currentCondition = data.observation.phrase_32char;
          windSpeed = `${data.observation.wdir_cardinal} ${unit.wspd} ${CONFIG.units === 'm' ? 'km/h' : 'mph'}`;
          // FIX: Translate 'gusts' fallback and add units if value exists
          gusts = unit.gust ? `${unit.gust} ${CONFIG.units === 'm' ? 'km/h' : 'mph'}` : 'Ninguna';
          feelsLike = unit.feels_like
          visibility = Math.round(unit.vis)
          humidity = unit.rh
          dewPoint = unit.dewpt
          pressure = unit.altimeter.toPrecision(4);
          let ptendCode = data.observation.ptend_code
          pressureTrend = (ptendCode == 1 || ptendCode == 3) ? '▲' : ptendCode == 0 ? '' : '▼';
          currentIcon = data.observation.icon_code
          fetchAlerts();
        });
      });
  };

  // If we already have coordinates from the suggestion, skip the location search
  if (hasCoordinates) {
      fetchWeatherByCoords();
      return;
  }

  if (CONFIG.locationMode === "CITY") {
    fetch(`https://api.weather.com/v3/location/search?query=${cityName}&locationType=city&language=${CONFIG.language}&format=json&apiKey=${CONFIG.secrets.twcAPIKey}`)
      .then(function(response) {
        if (response.status == 404) {
          alert("Location not found!");
          return;
        }
        if (response.status !== 200) {
          alert("Something went wrong (check the console)");
          return;
        }
        response.json().then(function(data) {
          if (data.location && data.location.address.length > 0) {
            latitude = data.location.latitude[0];
            longitude = data.location.longitude[0];
            cityName = data.location.city[0].toUpperCase();
            fetchWeatherByCoords();
          } else {
            alert("Location not found!");
          }
        });
      })
      .catch(function(err) {
        alert("Something went wrong (check the console)");
        console.error(err);
      });
  } else {
    let location = "";
    if (CONFIG.locationMode == "POSTAL") {
      location = `postalKey=${zipCode}:${CONFIG.countryCode}`
    } else if (CONFIG.locationMode == "AIRPORT") {
      let airportCodeLength = airportCode.length;
      if (airportCodeLength == 3) {
        location = `iataCode=${airportCode}`
      } else if (airportCodeLength == 4) {
        location = `icaoCode=${airportCode}`
      } else {
        alert("Please enter a valid ICAO or IATA Code")
        return;
      }
    } else {
      alert("Please select a location type");
      return;
    }

    fetch(`https://api.weather.com/v3/location/point?${location}&language=${CONFIG.language}&format=json&apiKey=${CONFIG.secrets.twcAPIKey}`)
      .then(function(response) {
        if (response.status == 404) {
          alert("Location not found!")
          return;
        }
        if (response.status !== 200) {
          alert("Something went wrong (check the console)")
          return;
        }
        response.json().then(function(data) {
          try {
            if (CONFIG.locationMode == "AIRPORT") {
              cityName = data.location.airportName
                .toUpperCase()
                .replace("INTERNATIONAL", "INTL.")
                .replace("AIRPORT", "")
                .trim();
            } else {
              cityName = data.location.city.toUpperCase();
            }
            latitude = data.location.latitude;
            longitude = data.location.longitude;
            fetchWeatherByCoords();
          } catch (err) {
            alert('Enter valid ZIP code');
            console.error(err)
            getZipCodeFromUser();
          }
        });
      });
  }
}


  
// La función fetchRadarImages() ha sido eliminada y su lógica movida a MainScript.js






































