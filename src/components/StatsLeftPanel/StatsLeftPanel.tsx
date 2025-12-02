import type { OpeningSession } from '../../types/state';
import {
    Accordion,
    AccordionBody,
    AccordionHeader,
    AccordionItem,
    Button,
    Col,
    Container,
    FormCheck,
    Image,
    ListGroup,
    ListGroupItem,
    Offcanvas,
    OffcanvasBody,
    OffcanvasHeader,
    OffcanvasTitle,
} from 'react-bootstrap';
import { useState } from 'react';
import type { Lootbox } from '../../types/lootTable';

export default function StatsLeftPanel({
    session,
    displayStatsPanel,
    onCloseStatsPanel,
}: {
    session: OpeningSession;
    displayStatsPanel: boolean;
    onCloseStatsPanel: () => void;
}) {
    const [displayUnobtainedRewards, setDisplayUnobtainedRewards] = useState<boolean>(false);

    /**
     * https://stackoverflow.com/a/55613750
     */
    const onExportSession = () => {
        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = 'pandora_session.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    };

    const renderLootboxes = () => {
        return (
            <AccordionItem eventKey="0">
                <AccordionHeader>Lootboxes stats</AccordionHeader>
                <AccordionBody className="p-0">
                    <ListGroup className="list-group-flush text-start m-0 text-wrap text-break">
                        {session.referenceLootTable.lootboxes.map((lootbox: Lootbox, idx: number) => (
                            <ListGroupItem
                                key={idx}
                                className="d-flex flex-row justify-content-between text-start gap-4 p-2"
                            >
                                <Col className="col-2">
                                    <Image
                                        src={lootbox.pictureUrl || 'images/default-loot-box.png'}
                                        alt={lootbox.name}
                                        className="object-fit-contain flex-grow-1 w-100 h-100"
                                    />
                                </Col>
                                <Col className="flex-grow-1 d-flex flex-column justify-content-center">
                                    <p>{lootbox.name}</p>
                                    <ul>
                                        <li>Purchased: {session.lootboxPurchasedCounters[lootbox.name]}</li>
                                        <li>Obtained in boxes: {session.aggregatedResults[lootbox.name]}</li>
                                        <li>Opened: {session.lootboxOpenedCounters[lootbox.name]}</li>
                                        <li>In inventory: {session.lootboxPendingCounters[lootbox.name]}</li>
                                        {lootbox.mainPrizeHardPity && (
                                            <li>
                                                Main prize pity: {session.pityCounters[lootbox.name].mainPity} /{' '}
                                                {lootbox.mainPrizeHardPity}
                                            </li>
                                        )}
                                        {lootbox.secondaryPrizeHardPity && (
                                            <li>
                                                Secondary prize pity: {session.pityCounters[lootbox.name].secondaryPity}{' '}
                                                / {lootbox.secondaryPrizeHardPity}
                                            </li>
                                        )}
                                    </ul>
                                </Col>
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                </AccordionBody>
            </AccordionItem>
        );
    };

    const renderRewards = () => {
        return (
            <AccordionItem eventKey="1">
                <AccordionHeader>Obtained rewards</AccordionHeader>
                <AccordionBody className="p-0">
                    <ListGroup className="list-group-flush text-start m-0 text-wrap text-break">
                        {session.history.length === 0 && !displayUnobtainedRewards && (
                            <ListGroupItem>
                                <p className="text-muted">
                                    <i>No reward has been obtained yet</i>
                                </p>
                            </ListGroupItem>
                        )}
                        {Object.keys(session.aggregatedResults)
                            .sort(
                                (a, b) =>
                                    session.referenceLootTableUniqueDrops[b].priority -
                                        session.referenceLootTableUniqueDrops[a].priority || a.localeCompare(b),
                            )
                            .filter((rewardName) =>
                                displayUnobtainedRewards ? true : session.aggregatedResults[rewardName] > 0,
                            )
                            .map((rewardName, idx) => (
                                <ListGroupItem
                                    key={idx}
                                    className={`d-flex flex-row justify-content-between text-start gap-4 p-2 ${session.aggregatedResults[rewardName] === 0 ? 'text-danger' : ''}`}
                                >
                                    <Col className="col-2">
                                        <Image
                                            src={
                                                session.referenceLootTableUniqueDrops[rewardName].drop.pictureUrl ||
                                                'images/default-loot-drop.png'
                                            }
                                            alt={rewardName}
                                            className="object-fit-contain flex-grow-1 w-100 h-100"
                                        />
                                    </Col>
                                    <Col className="flex-grow-1 d-flex flex-column justify-content-center">
                                        <p>{rewardName}</p>
                                    </Col>
                                    <Col className="col-auto d-flex flex-column justify-content-center">
                                        <p>
                                            x&nbsp;
                                            {new Intl.NumberFormat('en-US')
                                                .format(session.aggregatedResults[rewardName])
                                                .replaceAll(',', ' ')}
                                        </p>
                                    </Col>
                                </ListGroupItem>
                            ))}
                    </ListGroup>
                </AccordionBody>
            </AccordionItem>
        );
    };

    const renderHistory = () => {
        return (
            <AccordionItem eventKey="2">
                <AccordionHeader>Opening history</AccordionHeader>
                <AccordionBody className="p-0">
                    <ListGroup className="list-group-flush text-start m-0 text-wrap text-break">
                        {session.history.length === 0 && (
                            <ListGroupItem>
                                <p className="text-muted">
                                    <i>No lootbox has been opened yet</i>
                                </p>
                            </ListGroupItem>
                        )}
                        {session.history.toReversed().map((result, idx) => (
                            <ListGroupItem
                                key={idx}
                                className="d-flex flex-row justify-content-between text-start gap-4 p-2"
                            >
                                <Col className="col-2">
                                    <Image
                                        src={
                                            session.referenceLootTable.lootboxes.find(
                                                (lootbox: Lootbox) => lootbox.name === result.boxName,
                                            )!.pictureUrl || 'images/default-loot-box.png'
                                        }
                                        alt={result.boxName}
                                        className="object-fit-contain flex-grow-1 w-100 h-100"
                                    />
                                </Col>
                                <Col className="flex-grow-1 d-flex flex-column justify-content-center">
                                    <p>
                                        Box #{result.sessionOpeningNumber} - {result.boxName} #{result.boxOpeningNumber}
                                        <br />
                                        {session.referenceLootTable.lootboxes.find(
                                            (lootbox: Lootbox) => lootbox.name === result.boxName,
                                        )!.mainPrizeHardPity !== undefined
                                            ? `Main prize pity: ${result.boxMainPity}`
                                            : ''}
                                        <br />
                                        {session.referenceLootTable.lootboxes.find(
                                            (lootbox: Lootbox) => lootbox.name === result.boxName,
                                        )!.secondaryPrizeHardPity !== undefined
                                            ? `Secondary prize pity: ${result.boxMainPity}`
                                            : ''}
                                    </p>
                                    <ul>
                                        {result.drops.map((drop, dropIdx) => (
                                            <li key={`opening_${idx}_drop_${dropIdx}`}>
                                                <span
                                                    style={{
                                                        ...(drop.rarityInUi === 'main'
                                                            ? { color: 'var(--bs-warning) !important' }
                                                            : drop.rarityInUi === 'secondary'
                                                              ? { color: 'var(--bs-info) !important' }
                                                              : {}),
                                                    }}
                                                >
                                                    {new Intl.NumberFormat('en-US')
                                                        .format(drop.amount)
                                                        .replaceAll(',', ' ')}
                                                    x {drop.lootTableBranch.drop.name}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </Col>
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                </AccordionBody>
            </AccordionItem>
        );
    };

    return (
        <Offcanvas show={displayStatsPanel} onHide={onCloseStatsPanel}>
            <OffcanvasHeader closeButton>
                <OffcanvasTitle>Stats</OffcanvasTitle>
            </OffcanvasHeader>
            <OffcanvasBody className="d-flex flex-column gap-2 p-2">
                <FormCheck
                    type="switch"
                    label="Show unobtained rewards"
                    checked={displayUnobtainedRewards}
                    onChange={(e) => setDisplayUnobtainedRewards(e.target.checked)}
                />
                <Accordion defaultActiveKey="1">
                    {renderLootboxes()}
                    {renderRewards()}
                    {renderHistory()}
                </Accordion>
                <Container className="flex-grow-1" />
                <p className="text-muted">
                    <i>Should you have a use for it, you can download a raw dump of the session's state:</i>
                </p>
                <Button variant="outline-secondary" onClick={onExportSession}>
                    Download session state as JSON
                </Button>
            </OffcanvasBody>
        </Offcanvas>
    );
}
