import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = searchParams.get('lat')
    const lon = searchParams.get('lon')

    if (!lat || !lon) {
      return NextResponse.json({ error: 'lat and lon required' }, { status: 400 })
    }

    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Weather fetch failed' }, { status: 502 })
    }

    const data = await res.json()
    const temp = data.current?.temperature_2m
    const code = data.current?.weathercode

    if (temp == null || code == null) {
      return NextResponse.json({ error: 'No weather data' }, { status: 502 })
    }

    // Derive condition from WMO weather code
    let condition = 'clear'
    if (code >= 1 && code <= 3)          condition = 'cloudy'
    if (code >= 45 && code <= 48)        condition = 'fog'
    if (code >= 51 && code <= 67)        condition = 'rain'
    if (code >= 71 && code <= 77)        condition = 'snow'
    if (code >= 80 && code <= 82)        condition = 'rain'
    if (code >= 95 && code <= 99)        condition = 'storm'

    return NextResponse.json({ temp: Math.round(temp), code, condition })
  } catch (err) {
    console.error('[api/weather] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
