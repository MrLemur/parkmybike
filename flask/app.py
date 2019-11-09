#!flask/bin/python
from flask import Flask, make_response, jsonify, abort
from flask_cors import CORS
from statistics import mean
from map_plot import GoogleMapPlotter
import json, base64, configparser

app = Flask(__name__)
CORS(app)

config = configparser.ConfigParser()
config.read('config.ini')

api_key = config['DEFAULT']['api_key']

coordinates = []
with open("cycle_parking.json", "r") as json_file:
    data = json.load(json_file)
    for feature in data["features"]:
        coordinates.append(
            tuple(reversed(feature["geometry"]["coordinates"]))
            + (feature["properties"]["FEATURE_ID"],)
        )


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


@app.route("/api/v1.0/parking/search/<location>", methods=["GET"])
def make_map(location):
    try:
        gmap = GoogleMapPlotter(0, 0, 16)
        gmap.apikey = api_key 
        chosen_location = gmap.geocode(location)

        nearby_cycle_parks = []

        for park in coordinates:
            if check_radius(chosen_location, park[:2]):
                nearby_cycle_parks.append(park)
                gmap.marker(
                    park[0],
                    park[1],
                    id=park[2],
                    img="https://mrlemur.eu.pythonanywhere.com/static/marker_icon.png",
                )

        if len(nearby_cycle_parks) < 5:
            for park in coordinates:
                if check_radius(chosen_location, park[:2], 350):
                    nearby_cycle_parks.append(park)
                    gmap.marker(
                        park[0],
                        park[1],
                        id=park[2],
                        img="https://mrlemur.eu.pythonanywhere.com/static/marker_icon.png",
                    )

        if len(nearby_cycle_parks) is 0:
            return jsonify({"error": "No bike parks found near location"})

        gmap.marker(
            chosen_location[0],
            chosen_location[1],
            img="https://mrlemur.eu.pythonanywhere.com/static/current_location.png",
        )

        gmap.center = get_centre_position(nearby_cycle_parks)

        lats, lons, id = zip(*nearby_cycle_parks)

        contents = gmap.draw()
        encoded = base64.b64encode(bytes(contents, "utf-8"))
        return jsonify({"base64": bytes.decode(encoded)})
    except Exception as e:
        return jsonify({"error": "Query submitted was invalid: " + str(e)})


@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({"error": "Not found"}), 404)


if __name__ == "__main__":
    app.run(debug=False)
