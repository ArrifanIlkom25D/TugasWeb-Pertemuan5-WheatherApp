// Ganti dengan API key OpenWeatherMap milikmu (https://openweathermap.org/api)
const API_KEY = "2ca60da8cc79c7624010c99db7750bbf";
const BASE_URL = "https://api.openweathermap.org/data/2.5";
const HISTORY_KEY = "weather-history";

const form = document.getElementById("form");
const cityInput = document.getElementById("city");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const historyEl = document.getElementById("history");

let unit = "C";       // "C" atau "F"
let lastData = null;  // { current, forecast } untuk render ulang saat toggle

// ---------- Util ----------
const toUnit = (c) => Math.round(unit === "C" ? c : (c * 9) / 5 + 32);
const iconUrl = (code) => `https://openweathermap.org/img/wn/${code}@2x.png`;
const dayName = (dt) =>
  new Date(dt * 1000).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });

const showLoading = () => {
  statusEl.innerHTML = `<div class="loading"><span class="spinner"></span>Mengambil data cuaca…</div>`;
  resultEl.hidden = true;
};
const showError = (msg) => {
  statusEl.innerHTML = `<div class="error">${msg}</div>`;
  resultEl.hidden = true;
};

// ---------- Fetch ----------
const getJson = async (path, city) => {
  const url = `${BASE_URL}/${path}?q=${encodeURIComponent(city)}&units=metric&lang=id&appid=${API_KEY}`;
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Tidak ada koneksi internet. Periksa jaringanmu lalu coba lagi.");
  }
  if (res.status === 404) throw new Error(`Kota "${city}" tidak ditemukan. Periksa ejaannya.`);
  if (res.status === 401) throw new Error("API key tidak valid atau belum aktif.");
  if (!res.ok) throw new Error(`Terjadi kesalahan server (kode ${res.status}).`);
  return res.json();
};

const fetchWeather = async (city) => {
  const [current, forecast] = await Promise.all([
    getJson("weather", city),
    getJson("forecast", city),
  ]);
  return { current, forecast };
};

// ---------- Render ----------
const render = () => {
  if (!lastData) return;
  const { current, forecast } = lastData;
  const w = current.weather[0];

  // Ambil satu data per hari (jam 12:00) lalu ubah ke HTML dengan map
  const days = forecast.list
    .filter((item) => item.dt_txt.includes("12:00:00"))
    .map((item) => `
      <div class="day">
        <div>${dayName(item.dt)}</div>
        <img src="${iconUrl(item.weather[0].icon)}" alt="${item.weather[0].description}">
        <strong>${toUnit(item.main.temp)}°${unit}</strong>
      </div>`)
    .join("");

  resultEl.innerHTML = `
    <section class="current">
      <div class="now">
        <div>
          <h2>${current.name}, ${current.sys.country}</h2>
          <div class="temp">${toUnit(current.main.temp)}°${unit}</div>
          <p class="desc">${w.description}</p>
        </div>
        <img src="${iconUrl(w.icon)}" alt="${w.description}" width="96" height="96">
      </div>
      <p class="humid">Kelembaban: ${current.main.humidity}%</p>
      <button class="toggle" id="unitBtn" type="button">Tampilkan °${unit === "C" ? "F" : "C"}</button>
    </section>
    <div class="forecast" aria-label="Prakiraan 5 hari">${days}</div>`;

  document.getElementById("unitBtn").addEventListener("click", () => {
    unit = unit === "C" ? "F" : "C";
    render();
  });
  statusEl.innerHTML = "";
  resultEl.hidden = false;
};

// ---------- Riwayat (LocalStorage) ----------
const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
};
const saveHistory = (name) => {
  const list = [name, ...loadHistory().filter((c) => c.toLowerCase() !== name.toLowerCase())].slice(0, 5);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch {}
  renderHistory();
};
const renderHistory = () => {
  historyEl.innerHTML = loadHistory()
    .map((c) => `<button type="button" class="chip" data-city="${c}">${c}</button>`)
    .join("");
};

// ---------- Alur utama ----------
const search = async (city) => {
  showLoading();
  try {
    lastData = await fetchWeather(city);
    saveHistory(lastData.current.name);
    render();
  } catch (err) {
    showError(err.message);
  }
};

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (city) search(city);
});

historyEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  cityInput.value = chip.dataset.city;
  search(chip.dataset.city);
});

renderHistory();
