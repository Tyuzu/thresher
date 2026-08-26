import { createElement } from "../../../components/createElement.js";
import Button from "../../../components/base/Button.js";
import { fetchWeather } from "../api.js";

interface WeatherData {
  icon?: string;
  airTemp: number;
  location: string;
  humidity: number;
  windSpeed: number;
  soilTemp: number;
  rain24h: number;
}

async function loadWeather(): Promise<WeatherData> {
  const res = await fetchWeather();
  return res as WeatherData;
}

function renderContent(data: WeatherData, onRefresh: () => void): HTMLElement[] {
  const refreshBtn = Button({
    title: "🔄",
    id: "weather-refresh-btn",
    classes: "weather-refresh-btn",
    events: {
      click: onRefresh,
    },
  });

  return [
    createElement("div", { class: "weather-main" }, [
      createElement("span", { class: "weather-icon" }, [data.icon || "🌤️"]),
      createElement("span", { class: "temperature" }, [`${data.airTemp}°C Air`]),
      refreshBtn,
    ]),

    createElement("div", { class: "location" }, [data.location]),

    createElement("div", { class: "weather-extra" }, [
      createElement("span", { class: "humidity" }, [`💧 Humidity: ${data.humidity}%`]),
      createElement("span", { class: "wind" }, [`🌬️ Wind: ${data.windSpeed} km/h`]),
      createElement("span", { class: "soil-temp" }, [`🌱 Soil: ${data.soilTemp}°C`]),
      createElement("span", { class: "rain" }, [`🌧️ Rain: ${data.rain24h} mm`]),
    ]),
  ];
}

export function renderWeatherDetails(): HTMLElement {
  const section = createElement("section", { class: "info-widget" });

  const load = () => {
    section.textContent = "Loading weather...";

    loadWeather()
      .then((data) => {
        section.replaceChildren(...renderContent(data, load));
      })
      .catch(() => {
        const retryBtn = Button({
          title: "Retry",
          classes: "secondary-button",
          events: { click: load },
        });

        section.replaceChildren(
          createElement("p", {}, ["Unable to load weather"]),
          retryBtn
        );
      });
  };

  load();

  return section;
}