# Park My Bike - London Parking Map

![Logo](react/public/logo192.png)

Live version: [https://parkmybike.netlify.com/](https://parkmybike.netlify.com/)

This repository contains both the frontend app written in React, as well as the Flask backend used for calculating and generating the maps.

This is still a work in progress and should be thought of as such.

## Components

### React

The frontend is written in React, using the `create-react-app` bootstrap to provide the PWA functionality. It can be run by using the normal `yarn start` and `yarn build` commands (or your chosen dependency manager).

### Flask

The backend is a simple Python Flask application that provides an API for querying the cycle parking dataset. It returns a Google Map page with the required markers to enable the React app to function.

> The marker icon images are currently hard linked to my PythonAnywhere project, so will need updated on the relevant lines.

It uses a `config.ini` file in the `flask` directory to provide the Google Maps API key. In order for this to run successfully, create a `config.ini` file in the `flask` directory in the following format:

```ini
[DEFAULT]
api_key = x87gf8fgukyevfuovefyfvuo4vf4f
```

Path names to images and the dataset will need to be changed if using a production server to publish the application, such as WSGI.

## Dataset

The data used for the cycle parking infrastructure comes from [TfL originally](https://cycling.data.tfl.gov.uk/CyclingInfrastructure/data/points/cycle_parking.json) , a copy of which is included in this repository. The documentation for the dataset can be found [here](https://cycling.data.tfl.gov.uk/CyclingInfrastructure/documentation/asset_information_guide.pdf).