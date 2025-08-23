import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useState } from 'react';
import type { OpeningSession, SessionConfiguration } from './types/state';
import type { Maybe } from './types/utils';
import { Button, Col, Container, Image, Row } from 'react-bootstrap';
import { newSession, openOneAndUpdateState } from './scripts/openingSessionManager.ts';

function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SESSION MANAGEMENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Reinitialize the state's session using the given LootTable and SessionConfiguration */
    const initSession = (rawTable: string, checksum: string, simulatorConfig?: SessionConfiguration): void => {
        const session = newSession(rawTable, checksum);
        if (simulatorConfig) {
            session.simulatorConfig = simulatorConfig;
            // TODO: update other fields as needed
        }
        console.log('Initialized session:', session);
        setSession(session);
    };

    /** Completely clear the state. The user will be back to the loot table loader. */
    const clearSession = () => {
        setSession(null);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CALLBACKS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onConfigLoaded = (rawConfig: string): void => {
        if (!session) return;
        const simulatorConfig = JSON.parse(rawConfig) as SessionConfiguration;
        if (session.simulatorConfig.lootTableChecksum !== simulatorConfig.lootTableChecksum) {
            // TODO: there should probably be confirmation modals in this scenario
            console.warn('Loading config with an invalid loot table checksum');
        }
        initSession(JSON.stringify(session.referenceLootTable), simulatorConfig.lootTableChecksum, simulatorConfig);
    };

    const onTableLoaded = (rawTable: string) => {
        crypto.subtle
            .digest('SHA-1', new TextEncoder().encode(rawTable))
            .then((hash) => {
                // https://devdoc.net/web/developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest.html
                const hexCodes = [];
                const view = new DataView(hash);
                for (let i = 0; i < view.byteLength; i += 4) {
                    const value = view.getUint32(i);
                    const stringValue = value.toString(16);
                    const padding = '00000000';
                    const paddedValue = (padding + stringValue).slice(-padding.length);
                    hexCodes.push(paddedValue);
                }
                return Promise.resolve(hexCodes.join(''));
            })
            .then((checksum) => initSession(rawTable, checksum));
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ACTIONS & STUBS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const openOne = (selectedBox: string = session?.referenceLootTable.lootboxes[0].name) => {
        if (!session) return;

        // Costly but necessary for the session that's displayed. Won't clone every opening for auto sessions
        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;

        // If no box left in the inventory, purchase a new one.
        // Note: works for now, maybe we'll want to only enable the 'open' button if there is inventory, and add a
        //  purchase button for refills. And only bypass the restriction if a specific setting is enabled.
        if (passedState.lootboxPendingCounters[selectedBox] === 0) {
            passedState.lootboxPurchasedCounters[selectedBox]++;
            passedState.lootboxPendingCounters[selectedBox]++;
        }

        const newState = openOneAndUpdateState(passedState, selectedBox);
        setSession(newState);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // COMPONENTS RENDER & STUBS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const renderButtons = () => {
        return (
            session && (
                <Row className="justify-content-center">
                    <Col className="col-2">
                        <Button variant="primary" type="button" onClick={() => openOne()}>
                            GAMBA !
                        </Button>
                    </Col>
                    <Col className="col-2">
                        <Button variant="primary" type="button" onClick={clearSession}>
                            Reset session
                        </Button>
                    </Col>
                </Row>
            )
        );
    };

    const renderLatestResult = () => {
        return (
            session &&
            session.history.length > 0 && (
                <Row className="gap-4 gap-lg-0 justify-content-center">
                    {session.history[session.history.length - 1].drops.map((drop, idx) => (
                        <Col key={idx} style={{ maxWidth: '250px' }}>
                            <div
                                style={{
                                    width: '250px',
                                    height: '250px',
                                    backgroundImage: `url(${session.lootTableUniqueDrops[drop.name]?.backgroundUrl})`,
                                    backgroundSize: 'cover',
                                }}
                            >
                                <Image
                                    src={session.lootTableUniqueDrops[drop.name]?.pictureUrl}
                                    alt={drop.name}
                                    width="200px"
                                    height="200px"
                                    style={{
                                        objectFit: 'cover',
                                        margin: '25px',
                                    }}
                                />
                            </div>
                            <p>
                                {drop.amount}x {drop.name}
                            </p>
                        </Col>
                    ))}
                </Row>
            )
        );
    };

    const renderStats = () => {
        if (!session?.history.length) return;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { drops, ...lastPullMetadata } = session.history[session.history.length - 1];
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            referenceLootTable,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            dynamicLootTable,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            lootTableUniqueDrops,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            history,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            simulatorConfig,
            aggregatedResults,
            ...sessionMetadata
        } = session;

        return (
            session &&
            session.history.length > 0 && (
                <Row>
                    <Col className="text-start">
                        <pre>Last box metadata: {JSON.stringify(lastPullMetadata, null, 2)}</pre>
                    </Col>
                    <Col className="text-start">
                        <pre>Session metadata: {JSON.stringify(sessionMetadata, null, 2)}</pre>
                    </Col>
                    <Col className="text-start">
                        <pre>Total results: {JSON.stringify(aggregatedResults, null, 2)}</pre>
                    </Col>
                </Row>
            )
        );
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN LAYOUT RENDER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    return (
        <Container fluid className="d-flex flex-column gap-4">
            {!session && <LootTableLoader onTableLoaded={onTableLoaded} />}
            {renderLatestResult() /*TODO: remove stub*/}
            {renderButtons() /*TODO: remove stub*/}
            {renderStats() /*TODO: remove stub*/}
            {/*TODO CSS: fix the fucking grid and properly draw component container outlines*/}
            {/*TODO Component: prettier central opening view and last-results display (can reuse renderLatestResult for now, it's good enough for a start, animations would be nice)*/}
            {/*TODO Component: box-selector on the left (WoT Style, only in single-box mode)*/}
            {/*TODO Component: session config collapsable side-panel on the right, export/import config, download loot table and change loot table*/}
            {/*TODO Component: session stats overview collapsable side-panel on the left (WoT style)*/}
            {/*TODO Component: opening history (compact, with filters) collapsable side-panel on the left (next to session stats, or second tab of session stats)*/}
        </Container>
    );
}

export default App;
