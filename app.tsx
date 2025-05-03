import React, { useRef } from "react";
import { createRoot } from "react-dom/client";
import { Map } from "react-map-gl/maplibre";
import DeckGL, { DeckGLRef } from "@deck.gl/react";
import ParticleLayer from "./particle-layer";
import type { MapViewState } from "@deck.gl/core";

const INITIAL_VIEW_STATE: MapViewState = {
  longitude: 116,
  latitude: -32,
  zoom: 6.6,
};

const MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json";

const outputImg = "[PLACE_A_LINK_TO_YOUR_WEATHER_FORECAST_HERE]";

export default function App({
  image = null,
  mapStyle = MAP_STYLE,
}: {
  image?: ImageData | null;
  mapStyle?: string;
}) {
  const ref = useRef<DeckGLRef>(null);

  if (!image) {
    return;
  }
  const layers = [
    new ParticleLayer({
      id: "windlayer",
      image: outputImg,
      imageUnscale: [-128, 127],
      bounds: [-180, -90, 180, 90],
      numParticles: 2000,
      maxAge: 10,
      speedFactor: 3,
      color: [255, 255, 255, 255],
      width: 2,
      opacity: 0.5,
    }),
  ];
  return (
    <DeckGL
      ref={ref}
      layers={layers}
      initialViewState={INITIAL_VIEW_STATE}
      controller={true}
    >
      <Map reuseMaps mapStyle={mapStyle} />
    </DeckGL>
  );
}

export async function renderToDOM(container: HTMLDivElement) {
  const root = createRoot(container);
  root.render(<App />);

  const image = await loadImage(outputImg);
  root.render(<App image={image} />);
}

async function loadImage(url: string): Promise<ImageData> {
  const img = new Image();
  img.src = url;
  img.crossOrigin = "anonymous";
  try {
    await img.decode();
  } catch (e) {
    throw new Error(`Image ${url} can't be decoded.`);
  }
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const canvas2d = canvas.getContext("2d");
  canvas2d.drawImage(img, 0, 0);
  return canvas2d.getImageData(0, 0, canvas.width, canvas.height);
}
