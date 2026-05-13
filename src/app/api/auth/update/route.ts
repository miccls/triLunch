import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/socialStore";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "ERR_UNAUTHORIZED: Mission node not identified." }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "ERR_BAD_REQUEST: Data packet corrupted." }, { status: 400 });
    }

    const { avatarUrl, address } = body;
    let lat = null;
    let lng = null;

    if (address && address.trim() !== (user.address || "")) {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (apiKey) {
        const url = "https://places.googleapis.com/v1/places:searchText";
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.location",
          },
          body: JSON.stringify({ textQuery: address, maxResultCount: 1 }),
        });
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place && place.location) {
            lat = place.location.latitude;
            lng = place.location.longitude;
          }
        }
      }
    }

    const updatedUser = await updateUser(user.id, {
      avatarUrl: avatarUrl?.trim() || null,
      address: address?.trim() || null,
      lat: lat ?? user.lat,
      lng: lng ?? user.lng,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        avatarUrl: updatedUser.avatarUrl,
        address: updatedUser.address,
        lat: updatedUser.lat,
        lng: updatedUser.lng,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ERR_INTERNAL: Node synchronization failed.";
    console.error('Update Profile Picture Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
