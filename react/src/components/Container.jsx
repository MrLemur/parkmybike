import React, { useState, useContext, useEffect } from "react";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPython,
  faGithub,
  faReact
} from "@fortawesome/free-brands-svg-icons";
import { faBicycle, faLocationArrow } from "@fortawesome/free-solid-svg-icons";
import MapContext from "./MapContext";
import ModalContext from "./ModalContext";
import LoadingContext from "./LoadingContext";
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

async function fetchData(uri) {
  const data = await fetch(uri);
  let json = await data.json();
  return json;
}

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
        style={{ bottom: 0, pointerEvents: "none" }}
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
  const { setMap } = useContext(MapContext);
  const [query, setQuery] = useState("");
  const [centrePoint, setCentrePoint] = useState([]);
  const [completedQuery, setCompletedQuery] = useState("");
  const [showSearchAreaButton, setShowSearchAreaButton] = useState(false);
  const [searchButton, setSearchButton] = useState(<SearchButton />);
  const { loading, setLoading } = useContext(LoadingContext);
  const [locationButtonInside, setLocationButtonInside] = useState(
    "Use my current location"
  );

  const handleClose = () => setModal(false);

  useEffect(() => {
    const handleSearchMapArea = location => {
      if (
        (typeof location.data[0] === "string" ||
          location.data[0] instanceof String) &&
        location.data[0] === "map_moved"
      ) {
        setShowSearchAreaButton(true);
        setCentrePoint([location.data[1][0], location.data[1][1]]);
      }
    };
    window.addEventListener("message", handleSearchMapArea);
  }, [setCentrePoint]);

  useEffect(() => {
    if (completedQuery.length > 0) {
      setLoading(true);
      setSearchButton(
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
      let uri = `https://mrlemur.eu.pythonanywhere.com/api/v1.0/parking/search/${completedQuery}`;
      fetchData(uri)
        .then(data => {
          if (!data.error) {
            setMap(`data:text/html;base64,${data.base64}`);
            setSearchButton(<SearchButton />);
            setLoading(false);
          } else {
            setSearchButton(<SearchButton />);
            setLoading(false);
            setModal({
              title: "No bike parks found",
              body: `Could not find any bike parks near: ${completedQuery}`,
              show: true,
              className: "bg-danger text-white"
            });
          }
        })
        .catch(e => {
          setSearchButton(<SearchButton />);
          setLoading(false);
          setModal({
            title: "No bike parks found",
            body: `Could not find any bike parks near: ${completedQuery}`,
            show: true,
            className: "bg-danger text-white"
          });
        });
      setCompletedQuery("");
    }
    return () => {};
  }, [completedQuery, setMap, setModal, setLoading]);

  const handleSubmit = event => {
    event.preventDefault();
    setCompletedQuery(query + ", London, UK");
  };

  return (
    <Container className='h-100  d-flex flex-column px-0' fluid='True'>
      <Navbar bg='primary' variant='dark' expand='lg'>
        <Navbar.Brand>
          <img src='/logo192.png' style={{ width: "40px" }} className='pr-2' />
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
                  setCompletedQuery(`${coords.latitude},${coords.longitude}`);
                  setLocationButtonInside("Use my location");
                  setLoading(false);
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
        <Form inline onSubmit={handleSubmit}>
          <Form.Row>
            <Col>
              <FormControl
                type='text'
                placeholder='Enter address'
                id='query'
                className='mr-sm-0'
                onChange={e => setQuery(e.target.value)}
                required
              />
            </Col>
            <Col>{searchButton}</Col>
          </Form.Row>
        </Form>
      </Navbar>
      {children}
      <SearchAreaButton
        isVisible={showSearchAreaButton}
        action={() => {
          setCompletedQuery(centrePoint);
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
