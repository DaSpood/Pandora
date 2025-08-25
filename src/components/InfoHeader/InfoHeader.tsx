import { Button, Col, Container, Row } from 'react-bootstrap';
import { BsClockHistory, BsJournalText } from 'react-icons/bs';
import type { OpeningSession } from '../../types/state';

export default function InfoHeader({
    session,
    onOpenStatsPanel,
    onOpenHistoryPanel,
}: {
    session: OpeningSession;
    onOpenStatsPanel: () => void;
    onOpenHistoryPanel: () => void;
}) {
    return (
        <Container fluid className="px-0 py-2">
            <Row className="d-flex gap-0 justify-content-between px-0 mx-0">
                <Col className="col-auto">
                    <Button variant="outline-primary" type="button" onClick={onOpenStatsPanel} className="w-100">
                        <BsJournalText />
                    </Button>
                </Col>
                <Col className="flex-grow-1 text-center">
                    <h2>
                        {session.referenceLootTable.game} - {session.referenceLootTable.eventName}
                    </h2>
                </Col>
                <Col className="col-auto">
                    <Button variant="outline-primary" type="button" onClick={onOpenHistoryPanel} className="w-100">
                        <BsClockHistory />
                    </Button>
                </Col>
                {/*
                <Col className="col-auto">
                    <Button
                        variant="outline-primary"
                        type="button"
                        onClick={() => window.open('https://github.com/DaSpood/Pandora')}
                        className="w-100"
                    >
                        <BsGithub />
                    </Button>
                </Col>
                */}
            </Row>
        </Container>
    );
}
