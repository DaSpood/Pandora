import type { OpeningSession } from '../../types/state';
import type { Lootbox } from '../../types/lootTable';
import { Col, Container, Image, Row } from 'react-bootstrap';

export default function LootboxSelector({
    session,
    selectedLootboxName,
    onSelectedLootboxNameChanged,
    locked,
}: {
    session: OpeningSession;
    selectedLootboxName: string;
    onSelectedLootboxNameChanged: (newName: string) => void;
    locked: boolean;
}) {
    const nextGuarantee =
        session.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === selectedLootboxName)!
            .mainPrizeHardPity -
        (session.pityCounters[selectedLootboxName].mainPity - 1);

    return (
        session.simulatorConfig.openingMode !== 'until' && (
            <Container fluid className="py-2 px-0">
                <Container className="text-center mb-1">
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
                                className={`h-100 d-flex flex-column justify-content-between p-2 ${selectedLootboxName === lootboxName ? 'bg-gradient' : ''} rounded text-center`}
                                style={{ cursor: locked ? 'default' : 'pointer' }}
                                onClick={() => (locked ? () => {} : onSelectedLootboxNameChanged(lootboxName))}
                            >
                                <Image
                                    src={
                                        session.referenceLootTable.lootboxes.find(
                                            (box: Lootbox) => box.name === lootboxName,
                                        )!.pictureUrl || 'default-loot-box.png'
                                    }
                                    alt={lootboxName}
                                    className="object-fit-contain flex-grow-1"
                                />
                                {!session.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === lootboxName)!
                                    .pictureUrl && <p>{lootboxName}</p>}
                                {session.simulatorConfig.openingMode === 'budget' && (
                                    <p>x{session.lootboxPendingCounters[lootboxName]}</p>
                                )}
                            </Container>
                        </Col>
                    ))}
                </Row>
            </Container>
        )
    );
}
