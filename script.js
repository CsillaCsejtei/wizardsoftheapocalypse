// Get references to HTML elements
const cityInput = document.getElementById("cityInput"); // This is the input for city name
const fetchWeatherBtn = document.getElementById("fetchWeatherBtn");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessage = document.getElementById("errorMessage");
const errorText = document.getElementById("errorText");
const weatherDisplay = document.getElementById("weatherDisplay");
const weatherContent = document.getElementById("weatherContent");

// Open Weather Map API Key
const API_KEY = "f23ee9deb4e1a7450f3157c44ed020e1"; // Your API Key

// --- New API URLs for Geocoding ---
const GEO_DIRECT_API_URL = "https://api.openweathermap.org/geo/1.0/direct";
const GEO_ZIP_API_URL = "https://api.openweathermap.org/geo/1.0/zip";

// Function to display an error message
function showError(message) {
  errorText.textContent = message;
  errorMessage.classList.remove("d-none"); // Bootstrap class to show
  weatherDisplay.classList.add("d-none"); // Hide weather display on error
}

// Function to hide error message
function hideError() {
  errorMessage.classList.add("d-none"); // Bootstrap class to hide
}

// Event listener for the "Get Weather" button
fetchWeatherBtn.addEventListener("click", handleWeatherRequest);

// Event listener for the "Enter" key on the city input field
cityInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    handleWeatherRequest();
  }
});

/**
 * Attempts to fetch geographical coordinates (latitude, longitude) for a given location input.
 * It first tries to find it as a city name, then falls back to a postcode/ZIP code.
 * @param {string} locationInput - The user's input (e.g., "London", "E14", "90210").
 * @returns {Promise<{lat: number, lon: number, name: string, country: string}|null>} An object with coordinates, name, and country if found, otherwise null.
 */
async function fetchLocationCoordinates(locationInput) {
  // --- Attempt 1: Search by City Name (Direct Geocoding) ---
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
    // Do not throw, allow fallback to postcode
  }

  // --- Attempt 2: If city name failed, search by Postcode/ZIP Code ---
  // IMPORTANT: You need to specify a country code for ZIP/postcode lookups.
  // For the UK, use 'GB'. For US ZIP codes, use 'US'.
  // If your app is global, consider letting the user select the country or trying common ones.
  const countryCode = "GB"; // Defaulting to UK for this example. Adjust as needed.

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
        name: data.name || locationInput, // OWM ZIP API provides 'name' which is often the city
        country: data.country || countryCode, // Fallback to provided countryCode if OWM doesn't return
      };
    }
  } catch (error) {
    console.error("Error during postcode lookup:", error);
  }

  return null; // Location not found by either method
}

// Function to handle the full weather request (geocode then weather)
async function handleWeatherRequest() {
  hideError();
  weatherDisplay.classList.add("d-none");
  loadingIndicator.classList.remove("d-none");
  fetchWeatherBtn.disabled = true;

  const inputLocation = cityInput.value.trim(); // Changed 'city' to 'inputLocation' for clarity

  if (!inputLocation) {
    showError("Please enter a city name or postcode.");
    loadingIndicator.classList.add("d-none");
    fetchWeatherBtn.disabled = false;
    return;
  }

  try {
    // Step 1: Get Latitude and Longitude using the new combined function
    const locationInfo = await fetchLocationCoordinates(inputLocation);

    if (!locationInfo) {
      // No location found by either city or postcode
      showError(
        `Location "${inputLocation}" not found. Please check spelling or try a different city/postcode (e.g., "London", "E14").`
      );
      loadingIndicator.classList.add("d-none");
      fetchWeatherBtn.disabled = false;
      return;
    }

    // Extract information from the found location
    const latitude = locationInfo.lat;
    const longitude = locationInfo.lon;
    const cityName = locationInfo.name;
    const country = locationInfo.country;

    // Step 2: Fetch Weather Data using the obtained Latitude and Longitude
    await fetchWeatherData(latitude, longitude, cityName, country);
  } catch (error) {
    showError(`An unexpected error occurred: ${error.message}`);
  } finally {
    loadingIndicator.classList.add("d-none");
    fetchWeatherBtn.disabled = false;
  }
}

// Function to fetch weather data from OpenWeatherMap API (Current Weather Data)
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

    weatherContent.innerHTML = ""; // Clear previous weather content

    if (data && data.main && data.weather) {
      const temperature = data.main.temp;
      const humidity = data.main.humidity; // Corrected: This value IS available
      const weatherDescription = data.weather[0].description;
      const cloudCover = data.clouds ? data.clouds.all : "N/A"; // Corrected: This value IS available
      const iconCode = data.weather[0].icon; // Corrected: This value IS available
      const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`; // Icon URL
      
         // Time and location details
            const dt = data.dt; // Unix UTC timestamp, in seconds.
            const timezoneOffset = data.timezone; // Shift in seconds from UTC

            // Create a Date object from the UTC timestamp
            const utcDate = new Date(dt * 1000); // dt is in seconds, Date constructor expects milliseconds

            // Apply the timezone offset to get the local time at the queried location
            // We get the UTC milliseconds and add the offset in milliseconds
            const localDateAtLocation = new Date(utcDate.getTime() + (timezoneOffset * 1000));
            
            // Calculate local time
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
            weatherDisplay.classList.remove('d-none'); // Show weather display


      
    } else {
      showError(
        "No current weather data available for the specified location."
      );
    }
  } catch (error) {
    showError(`Failed to fetch weather data: ${error.message}`);
  }
}

// Remove the initial call on page load if you want the field to be empty
// window.onload = handleWeatherRequest; // Keep this commented out unless you want to load weather on page load
