import React, { useState, useContext, useEffect, useCallback } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPython,
  faGithub,
  faReact
} from "@fortawesome/free-brands-svg-icons";
import { faLocationArrow } from "@fortawesome/free-solid-svg-icons";
import MapContext from "./MapContext";
import ModalContext from "./ModalContext";
import LoadingContext from "./LoadingContext";
import {
  searchParkingByQuery,
  searchParkingByCoordinates
} from "../lib/api";
import {
  Navbar,
  Container,
  Nav,
  Form,
  FormControl,
  Button,
  Spinner,
  Modal,
  Card,
  Col,
  Fade
} from "react-bootstrap";

const getLocation = props => {
  return new Promise((res, rej) => {
    navigator.geolocation.getCurrentPosition(res, rej);
  });
};

const SearchButton = props => (
  <Button variant='success' type='submit'>
    Search
  </Button>
);

const LoadingScreen = props => {
  const { isVisible } = props;
  return isVisible ? (
    <Fade in={isVisible} timeout={1000}>
      <div
        style={{
          position: "absolute",
          color: "#fff",
          top: "0",
          left: "0",
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0,0,0, 0.3)",
          pointerEvents: isVisible ? "auto" : "none"
        }}
        className='h-100 d-flex justify-content-center flex-column'
      >
        <span className='mx-auto'>
          <Spinner
            animation='border'
            color='white'
            role='status'
            aria-hidden='true'
            className='mr-2'
          />
          <h2 className='d-inline'>Loading</h2>
        </span>
      </div>
    </Fade>
  ) : null;
};

const SearchAreaButton = props => {
  const { isVisible, action } = props;

  return (
    <Fade in={isVisible} timeout={1000}>
      <div
        className='w-100 position-absolute justify-content-center'
        style={{ bottom: 0, pointerEvents: "none", zIndex: 1000 }}
      >
        <Button
          variant='info'
          style={isVisible ? { pointerEvents: "auto" } : {}}
          className='mx-auto d-block mb-4'
          size='lg'
          onClick={action}
        >
          Search this area
        </Button>
      </div>
    </Fade>
  );
};

const AboutBody = () => (
  <Card className='text-center'>
    <Card.Body>
      <p>
        This is a simple implementation of a way to interact with the TfL
        cycling parking dataset.
      </p>
      <p>
        {" "}
        Designed by{" "}
        <a href='https://www.github.com/MrLemur'>
          <FontAwesomeIcon icon={faGithub} color='blue' /> MrLemur
        </a>
      </p>
      <p>
        Built with <FontAwesomeIcon icon={faReact} color='blue' size='lg' /> and{" "}
        <FontAwesomeIcon icon={faPython} color='blue' size='lg' />
      </p>
    </Card.Body>
    <Card.Footer className='small'>
      <p>Powered by TfL Open Data</p>
      <p>
        Contains OS data © Crown copyright and database rights 2016' and Geomni
        UK Map data © and database rights [2019]
      </p>
    </Card.Footer>
  </Card>
);

function Header(props) {
  const { modal, setModal } = useContext(ModalContext);
  const { children } = props;
  const { mapData, setMapData, setSelectedParkingId } = useContext(MapContext);
  const [query, setQuery] = useState("");
  const [pendingCenter, setPendingCenter] = useState(null);
  const [searchRequest, setSearchRequest] = useState(null);
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);
  const [searchButton, setSearchButton] = useState(<SearchButton />);
  const { loading, setLoading } = useContext(LoadingContext);
  const [locationButtonInside, setLocationButtonInside] = useState(
    "Use my location"
  );

  const handleClose = () =>
    setModal(current => ({ ...(current || {}), show: false }));

  const handleSubmit = event => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }
    setSearchRequest({ type: "query", value: `${trimmed}, London, UK` });
  };

  const handleMapMoved = useCallback(
    center => {
      if (!Array.isArray(center) || center.length !== 2) {
        return;
      }

      const [lat, lon] = center;
      const currentCenter = mapData?.properties?.center;
      const delta = currentCenter
        ? Math.sqrt(
            (lat - Number(currentCenter.lat || 0)) ** 2 +
              (lon - Number(currentCenter.lon || 0)) ** 2
          )
        : Number.POSITIVE_INFINITY;

      // Roughly > 50 metres
      if (delta < 0.0005) {
        return;
      }

      setPendingCenter({ lat, lon });
      setShowSearchAreaButton(true);
    },
    [mapData]
  );

  const enhancedChildren = React.Children.map(children, child =>
    React.isValidElement(child)
      ? React.cloneElement(child, { onMapMoved: handleMapMoved })
      : child
  );

  useEffect(() => {
    if (!searchRequest) {
      return;
    }

    let isCancelled = false;
    const label =
      searchRequest.type === "coordinates"
        ? `${Number(searchRequest.value.lat).toFixed(4)}, ${Number(
            searchRequest.value.lon
          ).toFixed(4)}`
        : searchRequest.value;

    const spinner = (
      <Button variant='warning' disabled>
        <Spinner
          as='span'
          animation='border'
          size='sm'
          role='status'
          aria-hidden='true'
          className='mr-1'
        />
        Searching
      </Button>
    );

    const runSearch = async () => {
      setLoading(true);
      setSearchButton(spinner);
      try {
        let data;
        if (searchRequest.type === "query") {
          data = await searchParkingByQuery(searchRequest.value);
        } else if (searchRequest.type === "coordinates") {
          data = await searchParkingByCoordinates(
            searchRequest.value.lat,
            searchRequest.value.lon
          );
        } else {
          throw new Error("Unsupported search request");
        }

        if (!data || data.error) {
          throw new Error(
            data?.error || `Could not find any bike parks near: ${label}`
          );
        }

        if (!isCancelled) {
          setMapData(data);
          setSelectedParkingId(null);
          setShowSearchAreaButton(false);
          setPendingCenter(null);
        }
      } catch (error) {
        if (!isCancelled) {
          setModal({
            title: "No bike parks found",
            body: error.message || `Could not find any bike parks near: ${label}`,
            show: true,
            className: "bg-danger text-white"
          });
        }
      } finally {
        if (!isCancelled) {
          setSearchButton(<SearchButton />);
          setLoading(false);
          setSearchRequest(null);
        }
      }
    };

    runSearch();

    return () => {
      isCancelled = true;
    };
  }, [
    searchRequest,
    setLoading,
    setMapData,
    setModal,
    setSelectedParkingId
  ]);

  return (
    <Container className='h-100 d-flex flex-column px-0 position-relative' fluid>
      <Navbar bg='primary' variant='dark' expand='lg'>
        <Navbar.Brand>
          <img
            alt='Logo'
            src='/logo192.png'
            style={{ width: "40px" }}
            className='pr-2'
          />
          Park My Bike
        </Navbar.Brand>
        <Navbar.Toggle aria-controls='basic-navbar-nav' />
        <Navbar.Collapse id='basic-navbar-nav'>
          <Nav className='mr-auto'>
            <Nav.Item>
              <Nav.Link
                onClick={() =>
                  setModal({
                    title: "About",
                    body: AboutBody(),
                    noPadding: true,
                    show: true,
                    className: "bg-primary text-white"
                  })
                }
              >
                About
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Navbar.Collapse>
        <Navbar.Text className='mr-sm-2'>
          <Button
            variant='info'
            onClick={() => {
              setLocationButtonInside("Getting location...");
              setLoading(true);
              getLocation()
                .then(e => {
                  const coords = e.coords;
                  setSearchRequest({
                    type: "coordinates",
                    value: {
                      lat: coords.latitude,
                      lon: coords.longitude
                    }
                  });
                  setLocationButtonInside("Use my location");
                })
                .catch(e => {
                  console.log(e);
                  setModal({
                    title: "Can't get GPS coordinates",
                    body:
                      "Please allow access to your location, or try typing the address manually",
                    show: true,
                    className: "bg-danger text-white"
                  });
                  setLocationButtonInside("Use my location");
                  setLoading(false);
                });
            }}
          >
            <FontAwesomeIcon icon={faLocationArrow} color='white' />{" "}
            {locationButtonInside}
          </Button>
        </Navbar.Text>
        <Form className="d-flex" onSubmit={handleSubmit}>
          <FormControl
            type='text'
            placeholder='Enter address'
            id='query'
            className='me-2'
            onChange={e => setQuery(e.target.value)}
            required
          />
          {searchButton}
        </Form>
      </Navbar>
  {enhancedChildren}
      <SearchAreaButton
        isVisible={showSearchAreaButton && Boolean(pendingCenter)}
        action={() => {
          if (!pendingCenter) {
            return;
          }
          setSearchRequest({ type: "coordinates", value: pendingCenter });
          setShowSearchAreaButton(false);
        }}
      />
      <Modal centered show={modal.show} onHide={handleClose}>
        <Modal.Header className={modal.className + " py-2"} closeButton>
          <Modal.Title>{modal.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className={modal.noPadding ? "p-0" : ""}>
          {modal.body}
        </Modal.Body>
      </Modal>
      <LoadingScreen isVisible={loading} />
    </Container>
  );
}

export default Header;
