const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const celsiusBtn = document.getElementById('celsius');
const fahrenheitBtn = document.getElementById('fahrenheit');
const cityCountry = document.getElementById('city-country');
const mainTemp = document.getElementById('temp');
const weatherCondition = document.getElementById('weather-condition');
const tempHigh = document.getElementById('temp-high');
const tempLow = document.getElementById('temp-low');
const humidity = document.getElementById('humid-percent');
const humidDesc = document.getElementById('humid-text');
const windSpeed = document.querySelector('.wind-spd');
const windDirec = document.getElementById('wind-direction');
const feelsLike = document.getElementById('fl-temp');
const feelsLikeDesc = document.getElementById('fl-text');
const cloudCover = document.getElementById('cloud-value');
const cloudDesc = document.getElementById('cloud-text');
const suggestionBox = document.getElementById('suggestions');
const hourlyStrip = document.getElementById('hourly-strip');
const forecastList = document.getElementById('forecast-list');

const apiKey = '21f6100f1b8285afacf6332851b0cd52';
let unit = 'metric';
let currentData = null;
let currentForecastData = null;
let suggestTimeout = null;

function toDisplay(tempC) {
    if (unit === 'metric') return `${Math.round(tempC)}°C`;
    return `${Math.round(tempC * 9/5 + 32)}°F`;
}

function windLabel(deg) {
    if (deg < 45) return 'N direction';
    if (deg < 90) return 'NE direction';
    if (deg < 135) return 'E direction';
    if (deg < 180) return 'SE direction';
    if (deg < 225) return 'S direction';
    if (deg < 270) return 'SW direction';
    if (deg < 315) return 'W direction';
    return 'NW direction';
}

function humidLabel(h) {
    if (h < 30) return 'Dry';
    if (h < 60) return 'Moderate';
    return 'High';
}

function feelsLabel(diff) {
    if (diff < -3) return 'Much cooler than actual';
    if (diff < 0) return 'Slightly cooler';
    if (diff === 0) return 'Same as actual';
    if (diff < 3) return 'Slightly warmer';
    return 'Much warmer than actual';
}

function cloudLabel(c) {
    if (c < 25) return 'Clear skies';
    if (c < 50) return 'Partly cloudy';
    if (c < 75) return 'Mostly cloudy';
    return 'Overcast';
}

function weatherEmoji(id) {
    if (id >= 200 && id < 300) return '⛈';
    if (id >= 300 && id < 400) return '🌦';
    if (id >= 500 && id < 600) return '🌧';
    if (id >= 600 && id < 700) return '❄️';
    if (id >= 700 && id < 800) return '🌫';
    if (id === 800) return '☀️';
    if (id === 801) return '🌤';
    if (id === 802) return '⛅';
    return '☁️';
}

function formatHour(dt, tz) {
    const utc = dt + tz;
    const d = new Date(utc * 1000);
    const h = d.getUTCHours();
    if (h === 0) return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function getDayName(dt, tz) {
    const utc = dt + tz;
    const d = new Date(utc * 1000);
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    return days[d.getUTCDay()];
}

function renderSummary() {
    if (!currentData) return;
    const d = currentData;
    mainTemp.textContent = toDisplay(d.main.temp);
    cityCountry.textContent = `${d.name}, ${d.sys.country}`;
    weatherCondition.textContent = d.weather[0].description;
    tempHigh.textContent = `H: ${toDisplay(d.main.temp_max)}`;
    tempLow.textContent = `L: ${toDisplay(d.main.temp_min)}`;
    humidity.textContent = `${d.main.humidity}%`;
    humidDesc.textContent = humidLabel(d.main.humidity);
    windSpeed.textContent = `${Math.round(d.wind.speed)}`;
    windDirec.textContent = windLabel(d.wind.deg);
    feelsLike.textContent = toDisplay(d.main.feels_like);
    feelsLikeDesc.textContent = feelsLabel(d.main.feels_like - d.main.temp);
    cloudCover.textContent = `${d.clouds.all}%`;
    cloudDesc.textContent = cloudLabel(d.clouds.all);
}

function renderHourly() {
    if (!currentForecastData) return;
    const tz = currentForecastData.city.timezone;
    const items = currentForecastData.list.slice(0, 8);
    hourlyStrip.innerHTML = items.map((item, i) => `
        <div class="hour-card${i === 0 ? ' now' : ''}">
            <span class="hour-time">${i === 0 ? 'Now' : formatHour(item.dt, tz)}</span>
            <span class="hour-icon">${weatherEmoji(item.weather[0].id)}</span>
            <span class="hour-temp">${toDisplay(item.main.temp)}</span>
        </div>
    `).join('');
}

function renderForecast() {
    if (!currentForecastData) return;
    const tz = currentForecastData.city.timezone;
    const list = currentForecastData.list;

    const days = {};
    list.forEach(item => {
        const day = getDayName(item.dt, tz);
        if (!days[day]) days[day] = { temps: [], ids: [] };
        days[day].temps.push(item.main.temp);
        days[day].ids.push(item.weather[0].id);
    });

    const entries = Object.entries(days).slice(0, 5);
    const allTemps = entries.flatMap(([, v]) => v.temps);
    const globalMin = Math.min(...allTemps);
    const globalMax = Math.max(...allTemps);

    forecastList.innerHTML = entries.map(([day, val], i) => {
        const low = Math.min(...val.temps);
        const high = Math.max(...val.temps);
        const midId = val.ids[Math.floor(val.ids.length / 2)];
        const range = globalMax - globalMin || 1;
        const barLeft = ((low - globalMin) / range) * 60;
        const barWidth = ((high - low) / range) * 60 + 10;
        return `
        <li class="forecast-row">
            <span class="forecast-day">${i === 0 ? 'Today' : day}</span>
            <span class="forecast-icon">${weatherEmoji(midId)}</span>
            <div class="forecast-bar-wrap">
                <div class="forecast-bar" style="width:${barWidth}%;margin-left:${barLeft}%"></div>
            </div>
            <div class="forecast-range">
                <span class="forecast-low">${toDisplay(low)}</span>
                <span class="forecast-high">${toDisplay(high)}</span>
            </div>
        </li>`;
    }).join('');
}

async function getWeather(city) {
    try {
        const [weatherRes, forecastRes] = await Promise.all([
            fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`),
            fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric`)
        ]);
        if (!weatherRes.ok) throw new Error(`Error ${weatherRes.status}`);
        const [weatherData, forecastData] = await Promise.all([weatherRes.json(), forecastRes.json()]);
        currentData = weatherData;
        currentForecastData = forecastData;
        renderSummary();
        renderHourly();
        renderForecast();
    } catch (error) {
        console.error('Failed to fetch weather:', error.message);
    }
}

async function fetchSuggestions(query) {
    try {
        const res = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`);
        const data = await res.json();
        return data;
    } catch {
        return [];
    }
}

function showSuggestions(cities) {
    if (!cities.length) { suggestionBox.classList.remove('active'); return; }
    suggestionBox.innerHTML = cities.map(c => `
        <div class="suggestion-item" data-name="${c.name}, ${c.country}">
            <i class="fa-solid fa-location-dot"></i>
            <span>${c.name}${c.state ? ', ' + c.state : ''}, ${c.country}</span>
        </div>
    `).join('');
    suggestionBox.classList.add('active');
}

suggestionBox.addEventListener('click', e => {
    const item = e.target.closest('.suggestion-item');
    if (!item) return;
    const name = item.dataset.name;
    searchInput.value = name;
    suggestionBox.classList.remove('active');
    getWeather(name);
});

searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    clearTimeout(suggestTimeout);
    if (val.length < 3) { suggestionBox.classList.remove('active'); return; }
    suggestTimeout = setTimeout(async () => {
        const cities = await fetchSuggestions(val);
        showSuggestions(cities);
    }, 300);
});

document.addEventListener('click', e => {
    if (!e.target.closest('.center')) suggestionBox.classList.remove('active');
});

searchBtn.addEventListener('click', () => {
    const val = searchInput.value.trim();
    if (!val) return;
    suggestionBox.classList.remove('active');
    getWeather(val);
});

searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
        const val = searchInput.value.trim();
        if (!val) return;
        suggestionBox.classList.remove('active');
        getWeather(val);
    }
});

celsiusBtn.addEventListener('click', () => {
    if (unit === 'metric') return;
    unit = 'metric';
    celsiusBtn.classList.add('active');
    fahrenheitBtn.classList.remove('active');
    renderSummary();
    renderHourly();
    renderForecast();
});

fahrenheitBtn.addEventListener('click', () => {
    if (unit === 'imperial') return;
    unit = 'imperial';
    fahrenheitBtn.classList.add('active');
    celsiusBtn.classList.remove('active');
    renderSummary();
    renderHourly();
    renderForecast();
});

getWeather('Johannesburg');
