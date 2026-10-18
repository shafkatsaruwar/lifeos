"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, CloudSun, Snowflake, Sun, Wind } from "lucide-react";

type WeatherState = {
  tempF: number;
  label: string;
  city: string;
  icon: "sun" | "cloud-sun" | "cloud" | "rain" | "snow" | "wind";
};

const SKYLINE =
  "https://images.unsplash.com/photo-1477959858617-67f85b34b5df?auto=format&fit=crop&w=900&q=80";

function weatherFromCode(code: number): Pick<WeatherState, "label" | "icon"> {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code <= 2) return { label: "Partly cloudy", icon: "cloud-sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Foggy", icon: "cloud" };
  if (code <= 67) return { label: "Rain", icon: "rain" };
  if (code <= 77) return { label: "Snow", icon: "snow" };
  if (code <= 82) return { label: "Showers", icon: "rain" };
  if (code <= 99) return { label: "Storms", icon: "rain" };
  return { label: "Local weather", icon: "wind" };
}

function WeatherIcon({ kind }: { kind: WeatherState["icon"] }) {
  const props = { size: 22, "aria-hidden": true as const };
  if (kind === "sun") return <Sun {...props} />;
  if (kind === "cloud-sun") return <CloudSun {...props} />;
  if (kind === "cloud") return <Cloud {...props} />;
  if (kind === "rain") return <CloudRain {...props} />;
  if (kind === "snow") return <Snowflake {...props} />;
  return <Wind {...props} />;
}

async function readCoords(): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) return null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 30 * 60_000,
      });
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return null;
  }
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherState | null> {
  try {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`;
    const placeUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
    const [weatherRes, placeRes] = await Promise.all([
      fetch(weatherUrl),
      fetch(placeUrl).catch(() => null),
    ]);
    if (!weatherRes.ok) return null;
    const weatherJson = await weatherRes.json();
    const temp = Number(weatherJson?.current?.temperature_2m);
    const code = Number(weatherJson?.current?.weather_code ?? 1);
    if (!Number.isFinite(temp)) return null;
    const meta = weatherFromCode(code);
    let city = "Nearby";
    if (placeRes?.ok) {
      const placeJson = await placeRes.json();
      city =
        placeJson?.city ||
        placeJson?.locality ||
        placeJson?.principalSubdivision ||
        placeJson?.countryName ||
        city;
    }
    return { tempF: Math.round(temp), city: String(city), ...meta };
  } catch {
    return null;
  }
}

export function NowWeatherWidget() {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const coords = await readCoords();
      if (cancelled) return;
      if (!coords) {
        setStatus("denied");
        return;
      }
      const next = await fetchWeather(coords.lat, coords.lon);
      if (cancelled) return;
      if (!next) {
        setStatus("denied");
        return;
      }
      setWeather(next);
      setStatus("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="atelier-glass-card atelier-weather-widget"
      style={{ backgroundImage: `linear-gradient(120deg, rgba(15,23,42,.72), rgba(37,99,235,.45)), url(${SKYLINE})` }}
      aria-label="Local weather"
    >
      <div className="atelier-weather-copy">
        {status === "ready" && weather ? (
          <>
            <strong>
              {weather.city} {weather.tempF}°
            </strong>
            <span>{weather.label}</span>
          </>
        ) : status === "loading" ? (
          <>
            <strong>Finding skyline…</strong>
            <span>Local conditions</span>
          </>
        ) : (
          <>
            <strong>Your skyline</strong>
            <span>Allow location for live weather</span>
          </>
        )}
      </div>
      <div className="atelier-weather-icon">
        <WeatherIcon kind={weather?.icon ?? "cloud-sun"} />
      </div>
    </div>
  );
}
