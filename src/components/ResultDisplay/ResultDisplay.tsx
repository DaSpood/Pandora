import { Col, Container, Image, Row } from 'react-bootstrap';
import type { OpeningSession } from '../../types/state';

export default function ResultDisplay({ session }: { session: OpeningSession }) {
    return (
        <Container fluid>
            <Row className="d-flex justify-content-center">
                {session.history.length > 0 &&
                    session.history[session.history.length - 1].drops.map((drop, idx) => (
                        <Col key={idx} className="col-4 col-lg-2">
                            <Container
                                className={`h-100 d-flex flex-column justify-content-between p-2 bg-gradient rounded text-center ${drop.rarityInUi === 'main' ? 'border border-warning' : ''} ${drop.rarityInUi === 'secondary' ? 'border border-info' : ''}`}
                            >
                                <Image
                                    src={session.lootTableUniqueDrops[drop.name]?.pictureUrl || 'default-loot-icon.png'}
                                    alt={drop.name}
                                    className="object-fit-contain flex-grow-1"
                                />
                                <p>
                                    {drop.amount}x {drop.name}
                                </p>
                            </Container>
                        </Col>
                    ))}
                {session.history.length == 0 && (
                    <p className="d-block d-lg-none text-center">
                        This app is not intended to be used on a mobile device. If the "open" button is hidden, you can
                        zoom-in, scroll down and zoom-out to collapse the browser's search bar and display the whole
                        page. I would recommend using a PC instead, though, other features may not display as intended
                        either.
                    </p>
                )}
            </Row>
        </Container>
    );
}
