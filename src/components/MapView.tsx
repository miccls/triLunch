"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const UserIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to adjust map bounds to fit all markers
function MapBounds({ userLocation, restaurants }: { userLocation: {lat: number, lng: number}, restaurants: any[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (!userLocation) return;
    
    const bounds = L.latLngBounds([userLocation.lat, userLocation.lng], [userLocation.lat, userLocation.lng]);
    
    restaurants.forEach(r => {
      if (r.lat && r.lng) {
        bounds.extend([r.lat, r.lng]);
      }
    });

    if (restaurants.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      map.setView([userLocation.lat, userLocation.lng], 14);
    }
  }, [map, userLocation, restaurants]);

  return null;
}

export default function MapView({ 
  userLocation, 
  restaurants 
}: { 
  userLocation: {lat: number, lng: number}, 
  restaurants: any[] 
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) return <div className="h-[500px] w-full bg-arcade-panel border-2 border-arcade-neon flex items-center justify-center neon-text blink tracking-widest font-mono">LOADING MAP_SYSTEM...</div>;

  return (
    <div className="h-[600px] w-full overflow-hidden z-0 relative dark-map font-mono uppercase">
      <MapContainer 
        center={[userLocation.lat, userLocation.lng]} 
        zoom={14} 
        scrollWheelZoom={false} 
        className="h-full w-full z-0 bg-black"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <Marker position={[userLocation.lat, userLocation.lng]} icon={UserIcon}>
          <Popup>
            <div className="font-bold text-arcade-accent tracking-widest text-center">YOU ARE HERE</div>
          </Popup>
        </Marker>

        {restaurants.map((restaurant, idx) => (
          restaurant.lat && restaurant.lng && (
            <Marker key={restaurant.id || idx} position={[restaurant.lat, restaurant.lng]}>
              <Popup>
                <div className="text-center w-48 font-mono uppercase bg-black text-arcade-neon p-1">
                  <h3 className="font-bold text-arcade-neon mb-1 tracking-widest">{restaurant.name}</h3>
                  <p className="text-[10px] text-arcade-text mb-2 tracking-wider">{restaurant.address}</p>
                  <p className="text-xs font-bold mb-2 text-arcade-accent">DST: {restaurant.distance} {restaurant.priceLevel && `• LVL: ${restaurant.priceLevel}`}</p>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${restaurant.lat},${restaurant.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-transparent border border-arcade-neon hover:bg-arcade-neon hover:text-black text-arcade-neon px-3 py-1 text-[10px] font-bold w-full tracking-widest transition-colors"
                  >
                    [ NAVIGATE_ ]
                  </a>
                </div>
              </Popup>
            </Marker>
          )
        ))}

        <MapBounds userLocation={userLocation} restaurants={restaurants} />
      </MapContainer>
    </div>
  );
}
