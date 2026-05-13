import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error("Google Places API Key is missing");
      return NextResponse.json({ error: "Google Places API Key is missing" }, { status: 500 });
    }

    const url = "https://places.googleapis.com/v1/places:searchText";
    const requestBody = {
      textQuery: address,
      maxResultCount: 1,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.location",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Geocode API Error:', errorText);
      throw new Error(`Google API responded with status ${response.status}`);
    }

    const data = await response.json();
    const place = data.places?.[0];

    if (!place || !place.location) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({
      lat: place.location.latitude,
      lng: place.location.longitude,
    });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
