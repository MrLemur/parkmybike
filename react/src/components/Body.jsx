import React, {
  useState,
  useEffect,
  Fragment,
  useContext,
  useMemo,
  useRef
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle
} from "@fortawesome/free-solid-svg-icons";
import MapContext from "./MapContext";
import LoadingContext from "./LoadingContext";
import ModalContext from "./ModalContext";
import {
  Row,
  Col,
  ListGroup,
  Modal,
  Carousel,
  Container,
  Button
} from "react-bootstrap";
import {
  MapContainer,
  TileLayer,
  Marker,
  CircleMarker,
  Tooltip,
  useMapEvents
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { fetchParkingDetails } from "../lib/api";

const DEFAULT_CENTER = [51.5074, -0.1278];
const TILE_LAYER_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_LAYER_ATTRIBUTION =
  "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
});

function formatDistance(metres) {
  if (metres === undefined || metres === null) {
    return null;
  }
  if (metres >= 1000) {
    return `${(metres / 1000).toFixed(1)} km`;
  }
  return `${Math.round(metres)} m`;
}

const MapEventHandler = ({ onMoveEnd, ignoreNextMoveRef }) => {
  useMapEvents({
    moveend(event) {
      if (!onMoveEnd) {
        return;
      }
      if (ignoreNextMoveRef.current) {
        ignoreNextMoveRef.current = false;
        return;
      }
      const center = event.target.getCenter();
      onMoveEnd([center.lat, center.lng]);
    }
  });
  return null;
};

const Body = ({ onMapMoved }) => {
  const { mapData, setSelectedParkingId } = useContext(MapContext);
  const mapInstanceRef = useRef(null);
  const ignoreNextMoveRef = useRef(false);

  const mapCenter = useMemo(() => {
    const center = mapData?.properties?.center;
    if (
      center &&
      typeof center.lat === "number" &&
      typeof center.lon === "number"
    ) {
      return [center.lat, center.lon];
    }
    return DEFAULT_CENTER;
  }, [mapData]);

  const zoomLevel = mapData?.properties?.zoom || 13;

  useEffect(() => {
    if (!mapInstanceRef.current) {
      return;
    }
    ignoreNextMoveRef.current = true;
    mapInstanceRef.current.setView(mapCenter, zoomLevel);
  }, [mapCenter, zoomLevel]);

  const features = useMemo(() => mapData?.features || [], [mapData]);
  const parkingFeatures = useMemo(
    () =>
      features.filter(
        feature => feature?.properties?.markerType === "parking"
      ),
    [features]
  );
  const originFeature = useMemo(
    () =>
      features.find(feature => feature?.properties?.markerType === "origin"),
    [features]
  );

  return (
    <Fragment>
      <Container className='d-flex flex-column flex-grow-1' fluid='true'>
        <Row className='flex-grow-1'>
          <Col
            className='px-0'
            style={{ position: "relative", minHeight: "400px" }}
          >
            <MapContainer
              center={mapCenter}
              zoom={zoomLevel}
              ref={mapInstanceRef}
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                url={TILE_LAYER_URL}
                attribution={TILE_LAYER_ATTRIBUTION}
              />
              <MapEventHandler
                onMoveEnd={onMapMoved}
                ignoreNextMoveRef={ignoreNextMoveRef}
              />
              {parkingFeatures.map(feature => {
                const [lon, lat] = feature.geometry.coordinates;
                const position = [lat, lon];
                const markerId = feature.properties?.id || feature.id;
                const distanceLabel = formatDistance(
                  feature.properties?.distanceMetres
                );
                return (
                  <Marker
                    key={markerId}
                    position={position}
                    eventHandlers={{
                      click: () => setSelectedParkingId(markerId)
                    }}
                  >
                    <Tooltip direction='top' offset={[0, -8]} opacity={0.9}>
                      <div>Bike parking</div>
                      {distanceLabel ? (
                        <div>Distance: {distanceLabel}</div>
                      ) : null}
                      <div>Click for details</div>
                    </Tooltip>
                  </Marker>
                );
              })}
              {originFeature ? (
                <CircleMarker
                  center={[
                    originFeature.geometry.coordinates[1],
                    originFeature.geometry.coordinates[0]
                  ]}
                  radius={7}
                  pathOptions={{
                    color: "#0d6efd",
                    fillColor: "#0d6efd",
                    fillOpacity: 0.5
                  }}
                >
                  <Tooltip direction='top' offset={[0, -8]} opacity={0.9}>
                    <div>{originFeature.properties?.label || "Search origin"}</div>
                  </Tooltip>
                </CircleMarker>
              ) : null}
            </MapContainer>
          </Col>
        </Row>
      </Container>
      <Details />
    </Fragment>
  );
};

const TrueOrFalse = ({ boolean }) => {
  if (boolean === "TRUE" || boolean === true) {
    return <FontAwesomeIcon icon={faCheckCircle} color='green' size='lg' />;
  }
  if (boolean === "FALSE" || boolean === false) {
    return <FontAwesomeIcon icon={faTimesCircle} color='red' size='lg' />;
  }
  return <span>Unknown</span>;
};

const Details = () => {
  const { setLoading } = useContext(LoadingContext);
  const { selectedParkingId, setSelectedParkingId } = useContext(MapContext);
  const { setModal } = useContext(ModalContext);
  const [details, setDetails] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    if (!selectedParkingId) {
      setDetails(null);
      setShow(false);
      return () => {
        isCancelled = true;
      };
    }

    const loadDetails = async () => {
      setLoading(true);
      try {
        const data = await fetchParkingDetails(selectedParkingId);
        if (!isCancelled) {
          setDetails(data);
          setShow(true);
        }
      } catch (error) {
        if (!isCancelled) {
          setModal({
            title: "Could not load bike park details",
            body:
              "There was a problem retrieving the details for this bike park. Please try again.",
            show: true,
            className: "bg-danger text-white"
          });
          setSelectedParkingId(null);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isCancelled = true;
    };
  }, [selectedParkingId, setLoading, setModal, setSelectedParkingId]);

  const photos = useMemo(() => {
    if (!details) {
      return [];
    }
    return [details["Photo 1"], details["Photo 2"]].filter(Boolean);
  }, [details]);

  const handleClose = () => {
    setShow(false);
    setSelectedParkingId(null);
  };

  const destination = details?.Coordinates;
  const directionsHref = destination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        destination
      )}&travelmode=bicycling`
    : null;

  return (
    <Modal centered show={show} onHide={handleClose}>
      <Modal.Body className='bg-light p-0 '>
        {photos.length > 0 ? (
          <Carousel>
            {photos.map((photoUrl, index) => (
              <Carousel.Item key={photoUrl || index}>
                <img
                  className='d-block w-100'
                  src={photoUrl}
                  alt={`Bike parking ${index + 1}`}
                />
              </Carousel.Item>
            ))}
          </Carousel>
        ) : (
          <div className='p-4 text-center'>No photos available</div>
        )}

        <ListGroup variant='flush'>
          <ListGroup.Item className='p-2'>
            <Button
              href={directionsHref || undefined}
              variant='success'
              target='_blank'
              block
              className='mx-auto'
              disabled={!directionsHref}
            >
              Get directions
            </Button>
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Bike capacity: {details?.["Bike capacity"] ?? "Unknown"}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Number of stands: {details?.["Number of stands"] ?? "Unknown"}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Stand type: {details?.["Stand type"] ?? "Unknown"}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            On carriageway: <TrueOrFalse boolean={details?.["On carriageway"]} />
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Under cover: <TrueOrFalse boolean={details?.["Under cover"]} />
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Secure area: <TrueOrFalse boolean={details?.["Secure area"]} />
          </ListGroup.Item>
        </ListGroup>
      </Modal.Body>
      <Button
        className='rounded-circle font-weight-bold'
        variant='danger'
        style={{ position: "absolute", top: -15, right: -5, zIndex: 1 }}
        onClick={handleClose}
      >
        X
      </Button>
    </Modal>
  );
};

export default Body;
