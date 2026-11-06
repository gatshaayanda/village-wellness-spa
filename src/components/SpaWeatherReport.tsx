"use client";

import { useEffect, useState } from "react";

type ForecastDay = { date: string; high?: number; low?: number; rainChance?: number; uv?: number; condition: string; icon: string; sunrise: string; sunset: string };
type WeatherData = {
  location: string;
  localTime: string;
  current: { temperature?: number; feelsLike?: number; condition: string; icon: string; humidity?: number; windKph?: number; uv?: number; updatedAt: string };
  days: ForecastDay[];
};

function dateLabel(value: string) {
  return new Date(value + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function SpaWeatherReport({ selectedDate }: { selectedDate?: string }) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/weather", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Forecast unavailable");
        return result as WeatherData;
      })
      .then((result) => { if (active) { setData(result); setUnavailable(false); } })
      .catch(() => { if (active) setUnavailable(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const selected = selectedDate ? data?.days.find((day) => day.date === selectedDate) : null;

  if (selectedDate) {
    return (
      <aside className="spaWeatherSelected" aria-live="polite">
        <span className="spaWeatherEyebrow">GABORONE · VISIT-DAY FORECAST</span>
        {loading ? <p>Checking the forecast for your selected date…</p>
          : selected ? <div className="spaWeatherSelectedGrid">
            <div><strong>{selected.condition}</strong><span>{Math.round(selected.low ?? 0)}–{Math.round(selected.high ?? 0)}°C</span></div>
            <div><small>Rain chance</small><b>{selected.rainChance ?? "—"}{selected.rainChance == null ? "" : "%"}</b></div>
            <div><small>UV index</small><b>{selected.uv ?? "—"}</b></div>
            <div><small>Sunrise · Sunset</small><b>{selected.sunrise || "—"} · {selected.sunset || "—"}</b></div>
          </div> : <p>{unavailable ? "The forecast is temporarily unavailable. Your appointment request is not affected." : "A reliable forecast for this date is not available yet. Check again closer to your visit."}</p>}
        <small>Forecasts can change. Use this for visit planning, not clinical or treatment advice. <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">Weather data by WeatherAPI.com</a>.</small>
      </aside>
    );
  }

  return (
    <section className="spaWeatherReport" aria-label="Gaborone weather report">
      <div className="spaWeatherReportHeading">
        <div><span className="spaWeatherEyebrow">PLAN YOUR VISIT · GABORONE</span><h2>Weather, at a glance.</h2></div>
        {data?.current?.updatedAt && <small>Updated {data.current.updatedAt}</small>}
      </div>
      {loading ? <p className="spaWeatherUnavailable">Loading the local forecast…</p>
        : unavailable || !data ? <p className="spaWeatherUnavailable">The local forecast is being connected. You can still browse treatments and request an appointment.</p>
        : <>
          <div className="spaWeatherCurrent">
            {data.current.icon && <img src={"https:" + data.current.icon} alt="" width="48" height="48"/>}
            <div><strong>{Math.round(data.current.temperature ?? 0)}°C</strong><span>{data.current.condition} · feels like {Math.round(data.current.feelsLike ?? 0)}°C</span></div>
            <div className="spaWeatherMetrics"><span>Humidity <b>{data.current.humidity ?? "—"}%</b></span><span>Wind <b>{Math.round(data.current.windKph ?? 0)} km/h</b></span><span>UV <b>{data.current.uv ?? "—"}</b></span></div>
          </div>
          <div className="spaWeatherDays">{data.days.map((day) => <article key={day.date}>
            <span>{dateLabel(day.date)}</span>
            {day.icon && <img src={"https:" + day.icon} alt="" width="32" height="32"/>}
            <strong>{Math.round(day.high ?? 0)}° <small>{Math.round(day.low ?? 0)}°</small></strong>
            <small>{day.rainChance ?? "—"}% rain</small>
          </article>)}</div>
        </>}
      <small className="spaWeatherAttribution">Forecasts can change. Weather data by <a href="https://www.weatherapi.com/" target="_blank" rel="noreferrer">WeatherAPI.com</a>. Weather is for visit planning, not clinical or treatment advice.</small>
    </section>
  );
}
