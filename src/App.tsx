import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useState } from 'react';
import type { OpeningResult, OpeningSession, SessionConfiguration } from './types/state';
import type { LootDrop, LootDropSubstitute, LootTable } from './types/lootTable';
import type { Maybe } from './types/utils';
import { Button, Col, Container, Image, Row } from 'react-bootstrap';
import { openOne } from './scripts/openingSessionManager.ts';

function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SESSION MANAGEMENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Generate a new OpeningSession object for the given LootTable using default values, does NOT setState */
    const newSession = (rawTable: string, checksum: string): OpeningSession => {
        const refTable = JSON.parse(rawTable) as LootTable;

        const allLootDrops: (LootDrop | LootDropSubstitute)[] = refTable.lootboxes.flatMap((box) =>
            box.lootSlots.flatMap((slot) =>
                slot.lootGroups.flatMap((groups) =>
                    groups.lootDrops.flatMap((drop) => (drop.substitute ? [drop, drop.substitute] : [drop])),
                ),
            ),
        );
        refTable.lootboxes.forEach((box) => {
            if (box.mainPrizeSubstitute) {
                allLootDrops.push(box.mainPrizeSubstitute);
            }
            if (box.secondaryPrizeSubstitute) {
                allLootDrops.push(box.secondaryPrizeSubstitute);
            }
        });

        const newSession: OpeningSession = {
            referenceLootTable: refTable,
            dynamicLootTable: JSON.parse(rawTable) as LootTable,
            lootTableUniqueDrops: allLootDrops.reduce(
                (acc, drop) => {
                    acc[drop.name] = {
                        name: drop.name,
                        pictureUrl: drop.pictureUrl,
                        backgroundUrl: drop.backgroundUrl,
                    };
                    return acc;
                },
                {} as Record<string, { name: string; pictureUrl?: string; backgroundUrl?: string }>,
            ),
            lootboxCounters: refTable.lootboxes.reduce(
                (acc, box) => {
                    acc[box.name] = 0;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            pityCounters: refTable.lootboxes.reduce(
                (acc, box) => {
                    acc[box.name] = { mainPity: 0, secondaryPity: 0 };
                    return acc;
                },
                {} as Record<string, { mainPity: number; secondaryPity: number }>,
            ),
            aggregatedResults: allLootDrops.reduce(
                (acc, drop) => {
                    acc[drop.name] = 0;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            history: [],
            simulatorConfig: {
                lootTableChecksum: checksum,
            },
        };
        return newSession;
    };

    /** Reinitialize the state's session using the given LootTable and SessionConfiguration */
    const initSession = (rawTable: string, checksum: string, simulatorConfig?: SessionConfiguration): void => {
        const session = newSession(rawTable, checksum);
        if (simulatorConfig) {
            session.simulatorConfig = simulatorConfig;
            // TODO: update other fields as needed
        }
        console.log(session);
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
    // STUBS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * TODO: complete opening algorithm
     * If I keep the state management component-side, this function will be mostly kept with added calls to various
     * post-open checks for duplicates and pity management. Probably best option for now.
     * Most likely will use a "manager" class that will handle the session and call setState. Probably an anti-pattern
     * but will make it much easier to implement running multiple long simulations in parallel. Easy enough to refactor
     * first option when needed.
     */
    const gamba = () => {
        if (!session) return;
        const resultDrops = openOne(session?.dynamicLootTable?.lootboxes[0]);
        const result: OpeningResult = {
            openingNumber: 1,
            boxName: session?.dynamicLootTable?.lootboxes[0].name,
            boxOpeningNumber: 1,
            mainHardPityReached: false,
            secondaryHardPityReached: false,
            drops: resultDrops,
        };
        const history = [...session.history, result];
        const aggregatedResults = { ...session.aggregatedResults };
        resultDrops.forEach((result) => (aggregatedResults[result.name] += result.amount));
        setSession((prevState) => ({ ...(prevState as OpeningSession), history, aggregatedResults }));
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // RENDER STUBS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const renderButtons = () => {
        return (
            session && (
                <Row className="justify-content-center">
                    <Col className="col-2">
                        <Button variant="primary" type="button" onClick={() => gamba()}>
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

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // RENDER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    return (
        <Container fluid className="d-flex flex-column gap-4">
            {!session && <LootTableLoader onTableLoaded={onTableLoaded} />}
            {renderLatestResult() /*TODO: remove stub*/}
            {renderButtons() /*TODO: remove stub*/}
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
