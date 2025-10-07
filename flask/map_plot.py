from typing import Dict, List, Optional

import requests


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "parkmybike-app/1.0"


class LeafletMapPlotter(object):
    """Generate a Leaflet map and provide simple geocoding via Nominatim."""

    def __init__(self, center_lat, center_lng, zoom):
        self.center = (float(center_lat), float(center_lng))
        self.zoom = int(zoom)
        self.points: List[Dict[str, object]] = []
        self.origin: Optional[Dict[str, object]] = None

    def geocode(self, location_string):
        response = requests.get(
            NOMINATIM_URL,
            params={"q": location_string, "format": "json", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        response.raise_for_status()
        results = response.json()
        if not results:
            raise ValueError("No results returned for location search")
        lat = float(results[0]["lat"])
        lon = float(results[0]["lon"])
        return lat, lon

    def marker(
        self,
        lat,
        lon,
        marker_type="parking",
        id=None,
        properties: Optional[Dict[str, object]] = None,
    ):
        point: Dict[str, object] = {
            "lat": float(lat),
            "lon": float(lon),
            "marker_type": marker_type,
            "id": id,
            "properties": properties or {},
        }
        if marker_type == "origin":
            self.origin = point
        else:
            self.points.append(point)

    def to_feature_collection(self):
        features: List[Dict[str, object]] = []
        all_points: List[Dict[str, object]] = []
        all_points.extend(self.points)
        if self.origin:
            all_points.append(self.origin)

        for index, point in enumerate(all_points):
            features.append(self._point_to_feature(point, index))

        bounds = None
        if all_points:
            lats = [point["lat"] for point in all_points]
            lons = [point["lon"] for point in all_points]
            bounds = [[min(lats), min(lons)], [max(lats), max(lons)]]

        origin_data = None
        if self.origin:
            origin_data = {
                "lat": self.origin["lat"],
                "lon": self.origin["lon"],
            }

        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "center": {"lat": self.center[0], "lon": self.center[1]},
                "zoom": self.zoom,
                "resultCount": len(self.points),
                "bounds": bounds,
                "origin": origin_data,
            },
        }

    def _point_to_feature(self, point: Dict[str, object], index: int):
        return {
            "type": "Feature",
            "id": point.get("id") or f"point-{index}",
            "geometry": {
                "type": "Point",
                "coordinates": [point["lon"], point["lat"]],
            },
            "properties": {
                **point.get("properties", {}),
                "markerType": point.get("marker_type", "parking"),
                "id": point.get("id"),
            },
        }
