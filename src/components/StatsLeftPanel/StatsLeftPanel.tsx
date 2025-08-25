/* eslint-disable @typescript-eslint/no-unused-vars */
import type { OpeningSession } from '../../types/state';
import { Offcanvas, OffcanvasBody, OffcanvasHeader, OffcanvasTitle, Row } from 'react-bootstrap';

export default function StatsLeftPanel({
    session,
    displayStatsPanel,
    onCloseStatsPanel,
}: {
    session: OpeningSession;
    displayStatsPanel: boolean;
    onCloseStatsPanel: () => void;
}) {
    const { drops, ...lastPullMetadata } = session.history.length ? session.history[session.history.length - 1] : {};
    const {
        referenceLootTable,
        dynamicLootTable,
        lootTableUniqueDrops,
        history,
        simulatorConfig,
        aggregatedResults,
        ...sessionMetadata
    } = session;

    return (
        <Offcanvas show={displayStatsPanel} onHide={onCloseStatsPanel}>
            <OffcanvasHeader closeButton>
                <OffcanvasTitle>Session stats</OffcanvasTitle>
            </OffcanvasHeader>
            <OffcanvasBody>
                <Row className="text-start">
                    <pre>Total results: {JSON.stringify(aggregatedResults, null, 2)}</pre>
                </Row>
                <Row className="text-start">
                    <pre>Last box metadata: {JSON.stringify(lastPullMetadata, null, 2)}</pre>
                </Row>
                <Row className="text-start">
                    <pre>Session metadata: {JSON.stringify(sessionMetadata, null, 2)}</pre>
                </Row>
            </OffcanvasBody>
        </Offcanvas>
    );
}
