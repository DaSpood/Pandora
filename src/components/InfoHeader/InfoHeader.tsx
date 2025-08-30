import { Button, Col, Container, Row } from 'react-bootstrap';
import { BsBarChartLine, BsGithub } from 'react-icons/bs';
import type { OpeningSession } from '../../types/state';

export default function InfoHeader({
    session,
    onOpenStatsPanel,
}: {
    session: OpeningSession;
    onOpenStatsPanel: () => void;
}) {
    return (
        <Container fluid className="px-0 py-2">
            <Row className="d-flex gap-0 justify-content-between px-0 mx-0">
                <Col className="col-auto">
                    <Button variant="outline-primary" type="button" onClick={onOpenStatsPanel} className="icon-button">
                        <BsBarChartLine />
                    </Button>
                </Col>
                <Col className="flex-grow-1 text-center">
                    <h2 className="d-none d-md-inline-block">
                        {session.referenceLootTable.game} - {session.referenceLootTable.eventName}
                    </h2>
                    <h3 className="d-md-none d-inline-block">
                        {session.referenceLootTable.game}
                        <br />
                        {session.referenceLootTable.eventName}
                    </h3>
                </Col>
                <Col className="col-auto">
                    <Button
                        variant="outline-primary"
                        type="button"
                        onClick={() => window.open('https://github.com/DaSpood/Pandora')}
                        className="icon-button"
                    >
                        <BsGithub />
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}
