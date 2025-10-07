# Park My Bike - London Parking Map

![Logo](react/public/logo192.png)

Live version: [https://parkmybike.netlify.app/](https://parkmybike.netlify.app/)

This repository contains both the frontend app written in React, as well as the Flask backend used for calculating and generating the maps.

This is still a work in progress and should be thought of as such.

## Components

### React

The frontend is written in React and now renders the Leaflet map directly in the browser. It consumes the backend's GeoJSON responses and visualises the results with interactive markers.

```bash
pnpm install
pnpm start
pnpm build
```

Set `VITE_API_BASE` if the backend is hosted on a different origin; by default the frontend talks to the same host/port.

### Flask

The Flask backend provides search and detail endpoints over the TfL dataset. The `/api/v1.0/parking/search` route returns structured GeoJSON (center, bounds, origin, and parking feature markers). The frontend uses this payload to render the map.

Path names to images and the dataset will still need to be adjusted if deploying beyond the default development setup.

## Dataset

The data used for the cycle parking infrastructure comes from [TfL originally](https://cycling.data.tfl.gov.uk/CyclingInfrastructure/data/points/cycle_parking.json) , a copy of which is included in this repository. The documentation for the dataset can be found [here](https://cycling.data.tfl.gov.uk/CyclingInfrastructure/documentation/asset_information_guide.pdf).
