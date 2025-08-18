import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useState } from 'react';
import type { OpeningResult, OpeningSession } from './types/state';
import type { LootDrop, LootTable } from './types/lootTable';
import type { Maybe } from './types/utils';
import { Button, Col, Container, Image, Row } from 'react-bootstrap';
import { openOne } from './scripts/openingSessionManager.ts';

/**
 * FIXME: move this to a utils file or something
 * https://devdoc.net/web/developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest.html
 */
const formatSha = (sha: ArrayBuffer): string => {
    const hexCodes = [];
    const view = new DataView(sha);
    for (let i = 0; i < view.byteLength; i += 4) {
        // Using getUint32 reduces the number of iterations needed (we process 4 bytes each time)
        const value = view.getUint32(i);
        // toString(16) will give the hex representation of the number without padding
        const stringValue = value.toString(16);
        // We use concatenation and slice for padding
        const padding = '00000000';
        const paddedValue = (padding + stringValue).slice(-padding.length);
        hexCodes.push(paddedValue);
    }
    // Join all the hex strings into one
    return hexCodes.join('');
};

function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);
    // FIXME: stub, will read directly from the session or use a callback eventually
    const [latestResult, setLatestResult] = useState<Maybe<OpeningResult>>(null);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // SESSION MANAGEMENT
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const resetSession = () => {
        setSession(null);
        setLatestResult(null);
    };

    const initSession = (table: LootTable, checksum: string): void => {
        // FIXME: Fix the lootTableDrops that currently ignore compensations.
        //  Maybe make a set of all names first then generate the empty record.
        //  Reuse lootTableDrops in aggregatedResults, and similarly extract table names elsewhere as well as the
        //  JSON.stringify of the loot table
        //  And clean this shit up
        const newSession: OpeningSession = {
            referenceLootTable: table,
            dynamicLootTable: JSON.parse(JSON.stringify(table)),
            lootTableDrops: table.lootboxes
                .flatMap((box) =>
                    box.lootSlots.flatMap((slot) => slot.lootGroups.flatMap((groups) => groups.lootDrops)),
                )
                .reduce(
                    (acc, drop) => {
                        acc[drop.name] = drop;
                        return acc;
                    },
                    {} as Record<string, LootDrop>,
                ),
            lootboxCounters: table.lootboxes.reduce(
                (acc, box) => {
                    acc[box.name] = 0;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            pityCounters: table.lootboxes.reduce(
                (acc, box) => {
                    acc[box.name] = { mainPity: 0, secondaryPity: 0 };
                    return acc;
                },
                {} as Record<string, { mainPity: number; secondaryPity: number }>,
            ),
            aggregatedResults: table.lootboxes
                .flatMap((box) =>
                    box.lootSlots.flatMap((slot) => slot.lootGroups.flatMap((groups) => groups.lootDrops)),
                )
                .reduce(
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
        console.log(newSession);
        setSession(newSession);
    };

    /*
    const applyConfig = (config: SessionConfiguration): void => {
        // TODO
    };
    */

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // STUBS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const gamba = () => {
        const resultDrops = openOne(session?.dynamicLootTable?.lootboxes[0]);
        const result: OpeningResult = {
            openingNumber: 1,
            boxName: session?.dynamicLootTable?.lootboxes[0].name,
            boxOpeningNumber: 1,
            mainHardPityReached: false,
            secondaryHardPityReached: false,
            drops: resultDrops,
        };
        setLatestResult(result);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // RENDER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const renderLoader = () => {
        return (
            !session && (
                <LootTableLoader
                    onTableLoaded={(table) =>
                        // TODO: clean this shit up
                        crypto.subtle
                            .digest('SHA-1', new TextEncoder().encode(table))
                            .then((sha) => initSession(JSON.parse(table), formatSha(sha)))
                    }
                />
            )
        );
    };

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
                        <Button variant="primary" type="button" onClick={resetSession}>
                            Reset session
                        </Button>
                    </Col>
                </Row>
            )
        );
    };

    const renderLatestResult = () => {
        return (
            latestResult &&
            session?.lootTableDrops && (
                <Row className="gap-4 gap-lg-0 justify-content-center">
                    {latestResult.drops.map((drop, idx) => (
                        <Col key={idx} style={{ maxWidth: '250px' }}>
                            <div
                                style={{
                                    width: '250px',
                                    height: '250px',
                                    backgroundImage: `url(${session.lootTableDrops[drop.name]?.backgroundUrl})`,
                                    backgroundSize: 'cover',
                                }}
                            >
                                <Image
                                    src={session.lootTableDrops[drop.name]?.pictureUrl}
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

    return (
        <Container fluid className="d-flex flex-column gap-4">
            {renderLoader()}
            {renderLatestResult()}
            {renderButtons()}
        </Container>
    );
}

export default App;
