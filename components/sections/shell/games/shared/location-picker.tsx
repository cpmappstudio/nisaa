"use client";

import {
  Map,
  MapMarker,
  MapSearchControl,
  MapTileLayer,
} from "@/components/ui/map";
import type { LatLngExpression } from "leaflet";
import { useRef, useState } from "react";
import { useMap } from "react-leaflet";

const DEFAULT_CENTER = [4.711, -74.0721] satisfies LatLngExpression;

type LocationData = { position: LatLngExpression; name: string };

interface LocationPickerProps {
  onLocationChange?: (location: LocationData | null) => void;
}

export function LocationPicker({ onLocationChange }: LocationPickerProps) {
  const callbackRef = useRef(onLocationChange);
  callbackRef.current = onLocationChange;

  return (
    <Map center={DEFAULT_CENTER}>
      <MapTileLayer />
      <SearchControlWithMarker callbackRef={callbackRef} />
    </Map>
  );
}

function SearchControlWithMarker({
  callbackRef,
}: {
  callbackRef: React.RefObject<
    ((location: LocationData | null) => void) | undefined
  >;
}) {
  const map = useMap();
  const [markerPosition, setMarkerPosition] = useState<LatLngExpression | null>(
    null,
  );

  return (
    <>
      <MapSearchControl
        className={`
          top-auto bottom-1
          [&_[data-slot=command-list]]:top-auto
          [&_[data-slot=command-list]]:bottom-full
          [&_[data-slot=command-list]]:mb-1
          [&_[data-slot=command-list]]:max-h-36
          [&_[data-slot=command-list]]:rounded-t-md
          [&_[data-slot=command-list]]:rounded-b-none
          [&_[data-slot=command-list]]:border-t
          [&_[data-slot=command-list]]:border-b-0
        `}
        limit={5}
        onPlaceSelect={(feature) => {
          const position =
            feature.geometry.coordinates.toReversed() as LatLngExpression;
          setMarkerPosition(position);
          map.panTo(position);
          map.setZoom(15);

          const { name, street, city, country } = feature.properties;
          const locationName = [name, street, city, country]
            .filter(Boolean)
            .join(", ");

          callbackRef.current?.({ position, name: locationName });
        }}
      />
      {markerPosition && <MapMarker position={markerPosition} />}
    </>
  );
}
