import { NextResponse } from "next/server";

type PlacesResponse = {
  places?: Array<{
    name?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    priceLevel?: string;
    photos?: Array<{ name: string }>;
    location?: {
      latitude?: number;
      longitude?: number;
    };
  }>;
};

export async function POST(request: Request) {
  try {
    const { query, lat, lng } = await request.json();

    if (!query || typeof lat !== "number" || typeof lng !== "number") {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;

    if (!apiKey) {
      console.error("Google Places API Key is missing");
      return NextResponse.json({ error: "Google Places API Key is missing" }, { status: 500 });
    }

    const url = "https://places.googleapis.com/v1/places:searchText";
    
    // Configure location bias to roughly 5 kilometers around the user's coordinates
    const requestBody = {
      textQuery: query,
      locationBias: {
        circle: {
          center: {
            latitude: lat,
            longitude: lng
          },
          radius: 5000.0
        }
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Request exactly what we need for the UI to keep payload size down
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.photos,places.location",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API Error Response:', errorText);
      throw new Error(`Google API responded with status ${response.status}`);
    }

    const data = (await response.json()) as PlacesResponse;
    const places = data.places || [];

    const formatPriceLevel = (level: string) => {
      switch (level) {
        case "PRICE_LEVEL_INEXPENSIVE": return "$";
        case "PRICE_LEVEL_MODERATE": return "$$";
        case "PRICE_LEVEL_EXPENSIVE": return "$$$";
        case "PRICE_LEVEL_VERY_EXPENSIVE": return "$$$$";
        default: return null;
      }
    };

    const restaurants = places.map((place) => {
      // Calculate distance from user to place using haversine formula
      let distanceStr = "Unknown";
      let distanceRaw = 999;
      if (typeof place.location?.latitude === "number" && typeof place.location?.longitude === "number") {
        distanceRaw = parseFloat(getDistanceInMiles(lat, lng, place.location.latitude, place.location.longitude));
        distanceStr = `${distanceRaw} mi`;
      }

      // Generate the URL for the first photo if available
      let imageUrl = null;
      if (place.photos && place.photos.length > 0) {
        const photoName = place.photos[0].name;
        // Uses the new Places API Media endpoint
        imageUrl = `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxHeightPx=400&maxWidthPx=800`;
      }

      return {
        id: place.name || Math.random().toString(), // Use place.name which is the unique resource name in Places API
        name: place.displayName?.text || "Unknown Restaurant",
        address: place.formattedAddress || "Unknown Address",
        rating: place.rating || null,
        distance: distanceStr,
        distanceRaw: distanceRaw,
        lat: place.location?.latitude || null,
        lng: place.location?.longitude || null,
        priceLevel: place.priceLevel ? formatPriceLevel(place.priceLevel) : null,
        imageUrl: imageUrl,
      };
    });

    return NextResponse.json({ restaurants });
  } catch (error) {
    console.error("Search API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper function to calculate distance between two coordinates
function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // Radius of the Earth in miles
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d.toFixed(1);
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
