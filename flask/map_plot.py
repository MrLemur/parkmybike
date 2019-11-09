import json
import requests


class GoogleMapPlotter(object):
    def __init__(self, center_lat, center_lng, zoom, apikey=""):
        self.center = (float(center_lat), float(center_lng))
        self.zoom = int(zoom)
        self.apikey = str(apikey)
        self.points = []

    def from_geocode(self, location_string, zoom=13):
        lat, lng = self.geocode(location_string)
        return (lat, lng, zoom)

    def geocode(self, location_string):
        r = requests.get(
            "https://maps.googleapis.com/maps/api/geocode/json?address={location_string}&key={apikey}".format(
                location_string=location_string, apikey=self.apikey
            )
        )
        geocode_result = json.loads(r.text)
        latlng_dict = geocode_result["results"][0]["geometry"]["location"]
        return latlng_dict["lat"], latlng_dict["lng"]

    def marker(self, lat, long, img, id=None):
        self.points.append((lat, long, img, id))

    def draw(self):

        with open("template.txt", "r") as file:
            template = str(file.read())
        if not self.apikey:
            self.apikey = ""
        if not self.center:
            self.center = ()
        if not self.zoom:
            self.zoom = ()
        markers = self.write_points()
        try:
            return template.format(
                api_key=self.apikey,
                lat=self.center[0],
                long=self.center[1],
                zoom=self.zoom,
                markers=markers,
            )
        except Exception as e:
            pass

    def write_points(self):
        string = ""
        for point in self.points:
            point = self.write_point(point[0], point[1], point[2], point[3])
            string += point
        return string

    def write_point(self, lat, long, img, id=None):
        if id:
            marker = """
        var latlng = new google.maps.LatLng({lat}, {long});
        var img = new google.maps.MarkerImage('{img}');
        var marker_{id} = new google.maps.Marker({{
        icon: '{img}',
        animation: google.maps.Animation.DROP,
        position: latlng
        }});
        marker_{id}.setMap(map);

        marker_{id}.addListener('click', function() {{
        window.parent.postMessage(["details","{id}"], "*");
        }});
          """.format(
                lat=lat, long=long, img=img, id=id
            )
        else:
            marker = """
        var latlng = new google.maps.LatLng({lat}, {long});
        var img = new google.maps.MarkerImage('{img}');
        var marker = new google.maps.Marker({{
        icon: '{img}',
        animation: google.maps.Animation.DROP,
        position: latlng
        }});
        marker.setMap(map);
          """.format(
                lat=lat, long=long, img=img
            )

        return marker
