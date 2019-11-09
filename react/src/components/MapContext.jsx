import React from "react";

const MapContext = React.createContext({});

export const MapProvider = MapContext.Provider;
export const MapConsumer = MapContext.Consumer;
export default MapContext;
