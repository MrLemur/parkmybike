import React, { useState, useEffect, Fragment, useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faTimesCircle
} from "@fortawesome/free-solid-svg-icons";
import MapContext from "./MapContext";
import LoadingContext from "./LoadingContext";
import {
  Row,
  Col,
  ListGroup,
  Modal,
  Carousel,
  Container,
  Button
} from "react-bootstrap";

const Body = props => {
  const { map } = useContext(MapContext);
  return (
    <Fragment>
      <Container className='d-flex flex-column flex-grow-1' fluid='true'>
        <Row className='flex-grow-1'>
          <Col className='px-0'>
            <iframe
              style={{
                border: "none",
                width: "100%",
                height: "100%"
              }}
              title='embed_map'
              src={map}
            />
          </Col>
        </Row>
      </Container>
      <Details />
    </Fragment>
  );
};

const TrueOrFalse = props => {
  const { boolean } = props;
  if (boolean === "TRUE") {
    return <FontAwesomeIcon icon={faCheckCircle} color='green' size='lg' />;
  } else {
    return <FontAwesomeIcon icon={faTimesCircle} color='red' size='lg' />;
  }
};

async function fetchData(uri) {
  const data = await fetch(uri);
  let json = await data.json();
  return json;
}

const Details = props => {
  const { setLoading } = useContext(LoadingContext);
  const [details, setDetails] = useState({});

  useEffect(() => {
    const handleDetails = parkingDetails => {
      if (
        (typeof parkingDetails.data[0] === "string" ||
          parkingDetails.data[0] instanceof String) &&
        parkingDetails.data[0] === "details"
      ) {
        setLoading(true);
        let uri =
          "https://mrlemur.eu.pythonanywhere.com/api/v1.0/parking/details/" +
          parkingDetails.data[1];
        fetchData(uri).then(data => {
          setDetails(data);
          handleShow();
          setLoading(false);
        });
      }
    };
    window.addEventListener("message", handleDetails);
  }, [setLoading]);
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <Modal centered show={show} onHide={handleClose}>

      <Modal.Body className='bg-light p-0 '>
        <Carousel>
          <Carousel.Item>
            <img
              className='d-block w-100'
              src={details["Photo 1"]}
              alt='Close up shot'
            />
          </Carousel.Item>
          <Carousel.Item>
            <img
              className='d-block w-100'
              src={details["Photo 2"]}
              alt='Wide shot'
            />
          </Carousel.Item>
        </Carousel>

        <ListGroup variant='flush'>
          <ListGroup.Item className='p-2'>
            <Button
              href={`https://www.google.com/maps/dir/?api=1&destination=${
                details["Coordinates"]
              }&travelmode=bicycling`}
              variant='success'
              target='_blank'
              block
              className='mx-auto'
            >
              Get directions
            </Button>
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Bike capacity: {details["Bike capacity"]}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Number of stands: {details["Number of stands"]}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Stand type: {details["Stand type"]}
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            On carriageway: <TrueOrFalse boolean={details["On carriageway"]} />
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Under cover: <TrueOrFalse boolean={details["Under cover"]} />
          </ListGroup.Item>
          <ListGroup.Item className='p-2'>
            Secure area: <TrueOrFalse boolean={details["Secure area"]} />
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
