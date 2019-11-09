import React from "react";

const LoadingContext = React.createContext({});

export const LoadingProvider = LoadingContext.Provider;
export const LoadingConsumer = LoadingContext.Consumer;
export default LoadingContext;
