import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useState } from 'react';
import type { OpeningSession, SessionConfiguration } from './types/state';
import type { Maybe } from './types/utils';
import {
    Button,
    Col,
    Container,
    Image,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Offcanvas,
    OffcanvasBody,
    OffcanvasHeader,
    OffcanvasTitle,
    Row,
} from 'react-bootstrap';
import { newSession, openOneAndUpdateState } from './scripts/openingSessionManager.ts';
import type { Lootbox } from './types/lootTable';
import { BsCartPlus, BsGear, BsGithub, BsJournalText } from 'react-icons/bs';

export default function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);
    const [selectedLootbox, setSelectedLootbox] = useState<string>('');
    const [showStats, setShowStats] = useState<boolean>(false);
    const [showPurchase, setShowPurchase] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ACTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Reinitialize the state's session using the given LootTable and SessionConfiguration */
    const initSession = (rawTable: string, checksum: string, simulatorConfig?: SessionConfiguration): void => {
        const initialSession = newSession(rawTable, checksum);
        if (simulatorConfig) {
            initialSession.simulatorConfig = simulatorConfig;
            // TODO: update other fields as needed
        }
        console.log('Initialized session:', initialSession);
        setSession(initialSession);
        setSelectedLootbox(
            initialSession.referenceLootTable.lootboxes.filter((box: Lootbox) => box.purchasable)[0].name,
        );
    };

    const openSelectedLootbox = () => {
        if (!session) return;
        const selectedBox = selectedLootbox || session?.referenceLootTable.lootboxes[0].name;

        // Costly but necessary for the session that's displayed. Won't clone every opening for auto sessions
        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;

        // If no box left in the inventory, purchase a new one.
        // Note: works for now, maybe we'll want to only enable the 'open' button if there is inventory, and add a
        //  purchase button for refills. And only bypass the restriction if a specific setting is enabled.
        if (passedState.lootboxPendingCounters[selectedBox] === 0) {
            if (session.simulatorConfig.openingMode === 'unlimited') {
                passedState.lootboxPurchasedCounters[selectedBox]++;
                passedState.lootboxPendingCounters[selectedBox]++;
            } else {
                console.error(
                    'Invalid state: "Open" button should be disabled if no boxes in inventory and not "unlimited" mode',
                );
                return;
            }
        }

        const newState = openOneAndUpdateState(passedState, selectedBox);
        setSession(newState);
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
    // COMPONENTS RENDER
    // FIXME: A lot (all?) of these should be moved to a dedicated component especially if they don't update the state
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const renderHeaderLootTableInfo = () => {
        return (
            session && (
                <Container fluid className="px-0 py-2">
                    <Row className="d-flex gap-0 justify-content-between px-0 mx-0">
                        <Col className="col-auto">
                            <Button
                                variant="outline-primary"
                                type="button"
                                onClick={() => setShowStats(true)}
                                className="w-100"
                            >
                                <BsJournalText />
                            </Button>
                        </Col>
                        <Col className="flex-grow-1 text-center">
                            <h2>
                                {session.referenceLootTable.game} - {session.referenceLootTable.eventName}
                            </h2>
                        </Col>
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
                    </Row>
                </Container>
            )
        );
    };

    const renderCenterLatestResult = () => {
        return (
            session &&
            session.history.length > 0 && (
                <Container fluid>
                    <Row className="d-flex justify-content-center">
                        {session.history[session.history.length - 1].drops.map((drop, idx) => (
                            <Col key={idx} className="col-4 col-lg-2">
                                <Container
                                    className={`h-100 d-flex flex-column justify-content-between p-2 bg-gradient rounded text-center ${drop.rarityInUi === 'main' ? 'border border-warning' : ''} ${drop.rarityInUi === 'secondary' ? 'border border-info' : ''}`}
                                >
                                    <Image
                                        src={session.lootTableUniqueDrops[drop.name]?.pictureUrl}
                                        alt={drop.name}
                                        className="object-fit-contain flex-grow-1"
                                    />
                                    <p>
                                        {drop.amount}x {drop.name}
                                    </p>
                                </Container>
                            </Col>
                        ))}
                    </Row>
                </Container>
            )
        );
    };

    const renderFooterLootboxSelector = () => {
        if (!session) return;

        const nextGuarantee =
            session.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === selectedLootbox)!
                .mainPrizeHardPity -
            (session.pityCounters[selectedLootbox].mainPity - 1);

        return (
            session && (
                <Container fluid className="py-2 px-0">
                    <Container className="text-center">
                        {nextGuarantee > 1 ? (
                            <p>
                                <b>Guaranteed main reward in {nextGuarantee} boxes</b>
                            </p>
                        ) : (
                            <p>
                                <b>The next box will contain a main reward !</b>
                            </p>
                        )}
                    </Container>
                    <Row className="d-flex justify-content-center">
                        {Object.keys(session.lootboxPendingCounters).map((lootboxName, idx) => (
                            <Col key={idx} className="col-3 col-lg-2 col-xxl-1">
                                <Container
                                    className={`h-100 d-flex flex-column justify-content-between p-2 ${selectedLootbox === lootboxName ? 'bg-gradient' : ''} rounded text-center`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => setSelectedLootbox(lootboxName)}
                                >
                                    <Image
                                        src={session.lootTableUniqueDrops[lootboxName]?.pictureUrl}
                                        alt={lootboxName}
                                        className="object-fit-contain flex-grow-1"
                                    />
                                    {session.simulatorConfig.openingMode !== 'unlimited' && (
                                        <p>x{session.lootboxPendingCounters[lootboxName]}</p>
                                    )}
                                </Container>
                            </Col>
                        ))}
                    </Row>
                </Container>
            )
        );
    };

    const renderFooterActionButtons = () => {
        return (
            session && (
                <Container fluid className="py-2 px-0">
                    <Row className="d-flex justify-content-center">
                        <Col
                            className={`col-auto ${session.simulatorConfig.openingMode !== 'unlimited' ? 'visible' : 'invisible'}`}
                        >
                            <Button
                                variant="outline-primary"
                                type="button"
                                onClick={() => setShowPurchase(true)}
                                className="w-100"
                            >
                                <BsCartPlus />
                            </Button>
                        </Col>
                        <Col className="col-4">
                            <Button
                                variant="primary"
                                type="button"
                                onClick={openSelectedLootbox}
                                className="w-100"
                                disabled={
                                    session.lootboxPendingCounters[selectedLootbox] === 0 &&
                                    session.simulatorConfig.openingMode !== 'unlimited'
                                }
                            >
                                Open
                            </Button>
                        </Col>
                        <Col className="col-auto">
                            <Button
                                variant="outline-primary"
                                type="button"
                                onClick={() => setShowSettings(true)}
                                className="w-100"
                            >
                                <BsGear />
                            </Button>
                        </Col>
                    </Row>
                </Container>
            )
        );
    };

    const renderLeftPanelStats = () => {
        if (!session) return;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { drops, ...lastPullMetadata } = session.history.length
            ? session.history[session.history.length - 1]
            : {};
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
            <Offcanvas show={showStats} onHide={() => setShowStats(false)}>
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
    };

    const renderModalSettings = () => {
        return (
            session && (
                <Modal show={showSettings} onHide={() => setShowSettings(false)}>
                    <ModalHeader closeButton>
                        <ModalTitle>Session settings</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <Button variant="danger" onClick={() => setSession(null)}>
                            Reset session
                        </Button>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="secondary" onClick={() => setShowSettings(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" disabled>
                            Save changes
                        </Button>
                    </ModalFooter>
                </Modal>
            )
        );
    };

    const renderModalPurchase = () => {
        return (
            session && (
                <Modal show={showPurchase} onHide={() => setShowPurchase(false)}>
                    <ModalHeader closeButton>
                        <ModalTitle>Purchase boxes</ModalTitle>
                    </ModalHeader>
                    <ModalBody>
                        <p>TODO</p>
                    </ModalBody>
                    <ModalFooter>
                        <Button variant="secondary" onClick={() => setShowPurchase(false)}>
                            Cancel
                        </Button>
                        <Button variant="primary" disabled>
                            Save changes
                        </Button>
                    </ModalFooter>
                </Modal>
            )
        );
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN LAYOUT RENDER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    return (
        <>
            {!session && <LootTableLoader onTableLoaded={onTableLoaded} />}
            {session && (
                <Container fluid className="d-flex flex-column min-vh-100 p-0 m-0">
                    <Container fluid className="d-flex align-items-center">
                        {renderHeaderLootTableInfo()}
                    </Container>
                    <Container fluid className="d-flex align-items-center flex-grow-1">
                        {renderCenterLatestResult()}
                    </Container>
                    <Container fluid className="d-flex align-items-center">
                        {renderFooterLootboxSelector()}
                    </Container>
                    <Container fluid className="d-flex align-items-center">
                        {renderFooterActionButtons()}
                    </Container>
                    {renderLeftPanelStats()}
                    {renderModalSettings()}
                    {renderModalPurchase()}
                </Container>
            )}
        </>
    );
}
