import React from "react";

const MapContext = React.createContext({
	mapData: null,
	setMapData: () => {},
	selectedParkingId: null,
	setSelectedParkingId: () => {}
});

export const MapProvider = MapContext.Provider;
export const MapConsumer = MapContext.Consumer;
export default MapContext;
