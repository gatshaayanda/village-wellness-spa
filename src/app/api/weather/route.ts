import { NextResponse } from "next/server";

export const revalidate = 1800;

export async function GET() {
  const key = process.env.WEATHERAPI_KEY;
  if (!key) return NextResponse.json({ error: "The weather report is being connected. Appointment requests remain available." }, { status: 503 });

  try {
    const url = new URL("https://api.weatherapi.com/v1/forecast.json");
    url.searchParams.set("key", key);
    url.searchParams.set("q", "Gaborone, Botswana");
    url.searchParams.set("days", "5");
    url.searchParams.set("aqi", "no");
    url.searchParams.set("alerts", "no");
    const response = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Weather provider unavailable");
    const data = await response.json() as {
      location?: { name?: string; localtime?: string };
      current?: { temp_c?: number; feelslike_c?: number; condition?: { text?: string; icon?: string }; humidity?: number; wind_kph?: number; uv?: number; last_updated?: string };
      forecast?: { forecastday?: Array<{ date?: string; day?: { maxtemp_c?: number; mintemp_c?: number; daily_chance_of_rain?: number; uv?: number; condition?: { text?: string; icon?: string } }; astro?: { sunrise?: string; sunset?: string } }> };
    };
    if (!data.current || !Array.isArray(data.forecast?.forecastday)) throw new Error("Incomplete weather response");

    return NextResponse.json({
      location: data.location?.name || "Gaborone",
      localTime: data.location?.localtime || "",
      current: {
        temperature: data.current.temp_c,
        feelsLike: data.current.feelslike_c,
        condition: data.current.condition?.text || "Conditions unavailable",
        icon: data.current.condition?.icon || "",
        humidity: data.current.humidity,
        windKph: data.current.wind_kph,
        uv: data.current.uv,
        updatedAt: data.current.last_updated || "",
      },
      days: data.forecast.forecastday.map((item) => ({
        date: item.date || "",
        high: item.day?.maxtemp_c,
        low: item.day?.mintemp_c,
        rainChance: item.day?.daily_chance_of_rain,
        uv: item.day?.uv,
        condition: item.day?.condition?.text || "Conditions unavailable",
        icon: item.day?.condition?.icon || "",
        sunrise: item.astro?.sunrise || "",
        sunset: item.astro?.sunset || "",
      })),
    }, { headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600" } });
  } catch (error) {
    console.error("[Village Wellness Spa] weather forecast unavailable", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "The Gaborone forecast is temporarily unavailable." }, { status: 503 });
  }
}
