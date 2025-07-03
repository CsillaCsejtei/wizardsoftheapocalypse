
const cityInput = document.getElementById("cityInput"); // This is the input for city name

const fetchWeatherBtn = document.getElementById("fetchWeatherBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const weatherDisplay = document.getElementById("weatherDisplay");
const weatherContent = document.getElementById("weatherContent");

const API_KEY = "f23ee9deb4e1a7450f3157c44ed020e1"; 

const GEO_DIRECT_API_URL = "https://api.openweathermap.org/geo/1.0/direct";
const GEO_ZIP_API_URL = "https://api.openweathermap.org/geo/1.0/zip";


function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove("d-none"); 
  weatherDisplay.classList.add("d-none"); 
}

function hideError() {
  errorMessage.classList.add("d-none"); 
}


fetchWeatherBtn.addEventListener("click", handleWeatherRequest);


cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    handleWeatherRequest();
  }
});

async function fetchLocationCoordinates(locationInput) {

  try {
    const cityQueryUrl = `${GEO_DIRECT_API_URL}?q=${encodeURIComponent(
      locationInput
    )}&limit=1&appid=${API_KEY}`;
    const response = await fetch(cityQueryUrl);
    const data = await response.json();

    if (response.ok && data.length > 0) {
      console.log(`Location found by city name: ${data[0].name}`);
      return {
        lat: data[0].lat,
        lon: data[0].lon,
        name: data[0].name,
        country: data[0].country,
      };
    }
  } catch (error) {
    console.error("Error during city name lookup:", error);
  
  }

  
  const countryCode = "GB";

  try {
    const zipQueryUrl = `${GEO_ZIP_API_URL}?zip=${encodeURIComponent(
      locationInput
    )},${countryCode}&appid=${API_KEY}`;
    const response = await fetch(zipQueryUrl);
    const data = await response.json();

    if (response.ok && data.lat && data.lon) {
      console.log(`Location found by postcode: ${data.name || locationInput}`);
      return {
        lat: data.lat,
        lon: data.lon,
        name: data.name || locationInput, 
        country: data.country || countryCode, 
      };
    }
  } catch (error) {
    console.error("Error during postcode lookup:", error);
  }

  return null; 
}

async function handleWeatherRequest() {
  hideError();
  weatherDisplay.classList.add("d-none");
  loadingIndicator.classList.remove("d-none");
  fetchWeatherBtn.disabled = true;

  const inputLocation = cityInput.value.trim(); 

  if (!inputLocation) {
    showError("Please enter a city name or postcode.");
    loadingIndicator.classList.add("d-none");
    fetchWeatherBtn.disabled = false;
    return;
  }

  try {

    const locationInfo = await fetchLocationCoordinates(inputLocation);

    if (!locationInfo) {
     
      showError(
        `Location "${inputLocation}" not found. Please check spelling or try a different city/postcode (e.g., "London", "E14").`
      );
      loadingIndicator.classList.add("d-none");
      fetchWeatherBtn.disabled = false;
      return;
    }

    const latitude = locationInfo.lat;
    const longitude = locationInfo.lon;
    const cityName = locationInfo.name;
    const country = locationInfo.country;


    await fetchWeatherData(latitude, longitude, cityName, country);
  } catch (error) {
    showError(`An unexpected error occurred: ${error.message}`);
  } finally {
    loadingIndicator.classList.add("d-none");
    fetchWeatherBtn.disabled = false;
  }
}

async function fetchWeatherData(latitude, longitude, cityName, country) {
  const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric`;

  try {
    const response = await fetch(weatherUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessageDetail =
        errorData.message || response.statusText || "Unknown error";
      throw new Error(
        `Weather data fetch failed: HTTP error! Status: ${response.status} - ${errorMessageDetail}`
      );
    }

    const data = await response.json();

    weatherContent.innerHTML = ""; 

    if (data && data.main && data.weather) {
      const temperature = data.main.temp;
      const humidity = data.main.humidity; 
      const weatherDescription = data.weather[0].description;
      const cloudCover = data.clouds ? data.clouds.all : "N/A"; 
      const iconCode = data.weather[0].icon; 
      const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`; 
            const dt = data.dt; 
            const timezoneOffset = data.timezone; 
            const utcDate = new Date(dt * 1000); 
            const localDateAtLocation = new Date(utcDate.getTime() + (timezoneOffset * 1000));
            const localTimestamp = (dt + timezoneOffset) * 1000; // Convert to milliseconds
            const localDate = new Date(localTimestamp);
            const localDateInTargetZone = new Date((dt + timezoneOffset) * 1000);
            const time = localDateInTargetZone.toLocaleString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC'
            });

            weatherContent.innerHTML = `
                <p class="weather-icon-container"><img src="${iconUrl}" alt="${weatherDescription} icon"></p>
                <p><strong>Location:</strong> ${cityName}, ${country} (<span title="Latitude">${latitude.toFixed(4)}</span>&deg;, <span title="Longitude">${longitude.toFixed(4)}</span>&deg;)</p>
                <p><strong>Time (Local):</strong> ${time}</p>
                <p><strong>Temperature:</strong> ${temperature} &deg;C</p>
                <p><strong>Weather:</strong> ${weatherDescription} </p>
            `;

            weatherDisplay.classList.remove('d-none');     
    } else {
      showError(
        "No current weather data available for the specified location."
      );
    }
  } catch (error) {
    showError(`Failed to fetch weather data: ${error.message}`);
  }
}

