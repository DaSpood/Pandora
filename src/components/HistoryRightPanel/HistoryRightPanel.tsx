import type { OpeningSession } from '../../types/state';
import { Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row } from 'react-bootstrap';

export default function HistoryRightPanel({
    session,
    displayHistoryPanel,
    onCloseHistoryPanel,
}: {
    session: OpeningSession;
    displayHistoryPanel: boolean;
    onCloseHistoryPanel: () => void;
}) {
    return (
        <Offcanvas placement="end" show={displayHistoryPanel} onHide={onCloseHistoryPanel}>
            <OffcanvasHeader closeButton>
                <OffcanvasTitle>Opening history</OffcanvasTitle>
            </OffcanvasHeader>
            <OffcanvasBody>
                <Row className="text-start">
                    <pre>{JSON.stringify(session.history.toReversed(), null, 2)}</pre>
                </Row>
            </OffcanvasBody>
        </Offcanvas>
    );
}
