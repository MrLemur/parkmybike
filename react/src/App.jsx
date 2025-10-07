import React, { useState } from "react";

import Container from "./components/Container";
import Body from "./components/Body";
import { MapProvider } from "./components/MapContext";
import { ModalProvider } from "./components/ModalContext";
import { LoadingProvider } from "./components/LoadingContext";

const INITIAL_MAP_DATA = {
  type: "FeatureCollection",
  properties: {
    center: { lat: 51.5074, lon: -0.1278 },
    zoom: 13,
    resultCount: 0,
    query: null,
    origin: null
  },
  features: []
};

function App() {
  const [mapData, setMapData] = useState(INITIAL_MAP_DATA);
  const [loading, setLoading] = useState(false);
  const [selectedParkingId, setSelectedParkingId] = useState(null);
  const [modal, setModal] = useState({
    title: "",
    body: "",
    className: "bg-primary text-white",
    show: false
  });
  return (
    <div className='App'>
      <MapProvider
        value={{
          mapData,
          setMapData,
          selectedParkingId,
          setSelectedParkingId
        }}
      >
        <LoadingProvider value={{ loading, setLoading }}>
          <ModalProvider value={{ modal, setModal }}>
            <Container>
              <Body />
            </Container>
          </ModalProvider>
        </LoadingProvider>
      </MapProvider>
    </div>
  );
}

export default App;
