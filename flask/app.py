#!flask/bin/python
from flask import Flask, make_response, jsonify, abort, request
from flask_cors import CORS
from statistics import mean
from map_plot import LeafletMapPlotter
import json
from math import radians, sin, cos, sqrt, atan2
from typing import List, Optional, Sequence, Tuple

app = Flask(__name__)
CORS(app)

Coordinate = Tuple[float, float]
ParkingRecord = Tuple[float, float, str]

coordinates: List[ParkingRecord] = []
with open("cycle_parking.json", "r") as json_file:
    data = json.load(json_file)
    for feature in data["features"]:
        coordinates.append(
            tuple(reversed(feature["geometry"]["coordinates"]))
            + (feature["properties"]["FEATURE_ID"],)
        )


def parse_coordinate_pair(value: Optional[str]) -> Optional[Coordinate]:
    if not value:
        return None
    try:
        lat_str, lon_str = [part.strip() for part in value.split(",", 1)]
        return float(lat_str), float(lon_str)
    except (ValueError, AttributeError):
        return None


def geodesic_distance(origin: Coordinate, target: Coordinate) -> float:
    """Return the distance in metres between two coordinates using Haversine."""

    lat1, lon1 = origin
    lat2, lon2 = target

    phi1, phi2 = radians(lat1), radians(lat2)
    d_phi = radians(lat2 - lat1)
    d_lambda = radians(lon2 - lon1)

    a = sin(d_phi / 2) ** 2 + cos(phi1) * cos(phi2) * sin(d_lambda / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    earth_radius_m = 6_371_000
    return earth_radius_m * c


@app.route("/")
def index():
    abort(404)


@app.route("/api/v1.0/parking/details/<parking_id>", methods=["GET"])
def return_parking_details(parking_id):
    try:
        details = get_parking_details(parking_id)
        response = {}
        response["Bike capacity"] = details["PRK_CPT"]
        response["Number of stands"] = details["PRK_PROVIS"]
        response["Stand type"] = get_definition(get_parking_stand_type(details))
        response["On carriageway"] = details["PRK_CARR"]
        response["Under cover"] = details["PRK_COVER"]
        response["Secure area"] = details["PRK_SECURE"]
        response["Photo 1"] = details["PHOTO1_URL"]
        response["Photo 2"] = details["PHOTO2_URL"]
        response["Coordinates"] = details["COORDINATES"]
        return jsonify(response)
    except:
        return jsonify({"error": "Could not find bike park with given ID"})


def get_definition(word):
    DESCRIPTIONS = {
        "PRK_CARR": "On carriageway",
        "PRK_COVER": "Under cover",
        "PRK_SECURE": "Secure area",
        "PRK_LOCKER": "Individual lockers",
        "PRK_SHEFF": "Sheffield stand",
        "PRK_MSTAND": "M stand",
        "PRK_PSTAND": "P stand",
        "PRK_HOOP": "Cyclehoop stand",
        "PRK_POST": "Post stand",
        "PRK_BUTERF": "Butterfly stand",
        "PRK_WHEEL": "Wheel rack",
        "PRK_HANGAR": "Bike hangar",
        "PRK_TIER": "Two tier stand",
        "PRK_OTHER": "Unknown stand type",
        "PRK_PROVIS": "Number of stands",
        "PRK_CPT": "Bike capacity",
    }
    try:
        return DESCRIPTIONS[word]
    except KeyError:
        return None


def get_parking_details(parking_id):
    with open("cycle_parking.json", "r") as json_file:
        data = json.load(json_file)
        for feature in data["features"]:
            if feature["properties"]["FEATURE_ID"] == parking_id:
                details = feature["properties"]
                details["COORDINATES"] = feature["geometry"]["coordinates"][::-1]
                return details


def get_parking_stand_type(details=get_parking_details("RWG057821")):
    STAND_TYPES = [
        "PRK_SHEFF",
        "PRK_MSTAND",
        "PRK_PSTAND",
        "PRK_HOOP",
        "PRK_POST",
        "PRK_BUTERF",
        "PRK_WHEEL",
        "PRK_HANGAR",
        "PRK_TIER",
        "PRK_LOCKER",
        "PRK_OTHER",
    ]
    for detail in details:
        if detail in STAND_TYPES:
            if details[detail] == "TRUE":
                return detail


def check_radius(chosen_x_y, cycle_park_x_y, radius_metres=250):

    radius = radius_metres * 0.000008988122901

    x, y = chosen_x_y
    pointX, pointY = cycle_park_x_y

    if ((x - radius) < pointX) and ((x + radius) > pointX):
        withinX = True
    else:
        withinX = False

    if ((y - radius) < pointY) and ((y + radius) > pointY):
        withinY = True
    else:
        withinY = False

    if withinX and withinY:
        return True
    else:
        return False


def get_centre_position(coordinates):
    lats, longs, id = zip(*coordinates)
    center_lat = mean(lats)
    center_long = mean(longs)
    return (center_lat, center_long)


def collect_nearby_parks(
    origin: Coordinate,
    minimum_results: int = 5,
    primary_radius: int = 250,
    secondary_radius: int = 350,
) -> List[ParkingRecord]:
    nearby: List[ParkingRecord] = []
    seen_ids = set()

    def add_park(park: ParkingRecord):
        if park[2] in seen_ids:
            return
        nearby.append(park)
        seen_ids.add(park[2])

    for park in coordinates:
        if check_radius(origin, park[:2], primary_radius):
            add_park(park)

    if len(nearby) < minimum_results:
        for park in coordinates:
            if check_radius(origin, park[:2], secondary_radius):
                add_park(park)

    return nearby


def build_map_response(
    plotter: LeafletMapPlotter,
    chosen_location: Coordinate,
    search_descriptor: Optional[dict] = None,
) -> dict:
    nearby_cycle_parks = collect_nearby_parks(chosen_location)

    if len(nearby_cycle_parks) == 0:
        raise ValueError("No bike parks found near location")

    for park in nearby_cycle_parks:
        distance = geodesic_distance(chosen_location, park[:2])
        plotter.marker(
            park[0],
            park[1],
            marker_type="parking",
            id=park[2],
            properties={"distanceMetres": round(distance, 1)},
        )

    plotter.marker(
        chosen_location[0],
        chosen_location[1],
        marker_type="origin",
        properties={"label": "Search origin"},
    )

    plotter.center = get_centre_position(nearby_cycle_parks)

    feature_collection = plotter.to_feature_collection()
    feature_collection["properties"]["query"] = search_descriptor or {}
    return feature_collection


def resolve_location(
    plotter: LeafletMapPlotter,
    location_string: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> Coordinate:
    if latitude is not None and longitude is not None:
        return float(latitude), float(longitude)

    direct_coordinates = parse_coordinate_pair(location_string)
    if direct_coordinates:
        return direct_coordinates

    if location_string:
        return plotter.geocode(location_string)

    raise ValueError("A search query or coordinates must be provided")


def build_search_response(
    location_string: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
) -> dict:
    plotter = LeafletMapPlotter(0, 0, 16)
    chosen_location = resolve_location(
        plotter, location_string=location_string, latitude=latitude, longitude=longitude
    )

    search_descriptor = {
        "query": location_string,
        "coordinates": {"lat": chosen_location[0], "lon": chosen_location[1]},
    }

    return build_map_response(plotter, chosen_location, search_descriptor)


@app.route("/api/v1.0/parking/search", methods=["GET"])
def search_parking():
    query = request.args.get("query")
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    try:
        return jsonify(build_search_response(query, lat, lon))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "Query submitted was invalid: " + str(exc)}), 400


@app.route("/api/v1.0/parking/search/<path:location>", methods=["GET"])
def search_parking_legacy(location):
    try:
        return jsonify(build_search_response(location))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "Query submitted was invalid: " + str(exc)}), 400


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({"error": "Not found"}), 404)


if __name__ == "__main__":
    app.run(port=5000, debug=False)
