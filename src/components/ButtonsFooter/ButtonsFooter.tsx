import type { OpeningSession } from '../../types/state';
import { Button, Col, Container, Row } from 'react-bootstrap';
import { BsCartPlus, BsGear } from 'react-icons/bs';

export default function ButtonsFooter({
    session,
    selectedLootboxName,
    onOpenPurchaseModal,
    onOpenSettingsModal,
    onOpenSelectedLootbox,
}: {
    session: OpeningSession;
    selectedLootboxName: string;
    onOpenPurchaseModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenSelectedLootbox: () => void;
}) {
    return (
        <Container fluid className="py-2 px-0">
            <Row className="d-flex justify-content-center">
                <Col
                    className={`col-auto ${session.simulatorConfig.openingMode !== 'unlimited' ? 'visible' : 'invisible'}`}
                >
                    <Button variant="outline-primary" type="button" onClick={onOpenPurchaseModal} className="w-100">
                        <BsCartPlus />
                    </Button>
                </Col>
                <Col className="col-4">
                    <Button
                        variant="primary"
                        type="button"
                        onClick={onOpenSelectedLootbox}
                        className="w-100"
                        disabled={
                            session.lootboxPendingCounters[selectedLootboxName] === 0 &&
                            session.simulatorConfig.openingMode !== 'unlimited'
                        }
                    >
                        Open
                    </Button>
                </Col>
                <Col className="col-auto">
                    <Button variant="outline-primary" type="button" onClick={onOpenSettingsModal} className="w-100">
                        <BsGear />
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}
