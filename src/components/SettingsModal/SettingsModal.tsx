import type { OpeningSession, SessionConfiguration } from '../../types/state';
import {
    Button,
    Col,
    Container,
    FormCheck,
    FormLabel,
    FormSelect,
    InputGroup,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
    Row,
} from 'react-bootstrap';
import { useEffect, useState } from 'react';
import type { LootDropType } from '../../types/lootTable';

export default function SettingsModal({
    session,
    displaySettingsModal,
    onCloseSettingsModal,
    onApplyConfig,
}: {
    session: OpeningSession;
    displaySettingsModal: boolean;
    onCloseSettingsModal: () => void;
    onApplyConfig: (simulatorConfig: SessionConfiguration) => void;
}) {
    const [openingMode, setOpeningMode] = useState<'unlimited' | 'budget' | 'until'>(
        session.simulatorConfig.openingMode,
    );
    const [preOwnedPrizes, setPreOwnedPrizes] = useState<Record<string, { name: string; type: LootDropType }>>({});
    const [targetPrizes, setTargetPrizes] = useState<Record<string, { name: string; type: LootDropType }>>({});

    useEffect(() => {
        setOpeningMode(session.simulatorConfig.openingMode);
        setPreOwnedPrizes(
            session.simulatorConfig.preOwnedPrizes.reduce(
                (acc, prize) => {
                    acc[prize.name] = { name: prize.name, type: prize.type };
                    return acc;
                },
                {} as Record<string, { name: string; type: LootDropType }>,
            ),
        );
        setTargetPrizes(
            session.simulatorConfig.targetPrizes.reduce(
                (acc, prize) => {
                    acc[prize.name] = { name: prize.name, type: prize.type };
                    return acc;
                },
                {} as Record<string, { name: string; type: LootDropType }>,
            ),
        );
    }, [session]);

    const applyConfig = () => {
        const newConfig = JSON.parse(JSON.stringify(session.simulatorConfig));
        newConfig.openingMode = openingMode;
        newConfig.preOwnedPrizes = Object.values(preOwnedPrizes);
        newConfig.targetPrizes = Object.values(targetPrizes);
        onApplyConfig(newConfig);
    };

    const onCheckChangePreOwned = (name: string, type: LootDropType, isChecked: boolean) => {
        const newPreOwnedPrizes = { ...preOwnedPrizes };
        if (isChecked) {
            newPreOwnedPrizes[name] = { name, type };
        } else {
            delete newPreOwnedPrizes[name];
        }
        setPreOwnedPrizes(newPreOwnedPrizes);
    };

    const onCheckChangeTarget = (name: string, type: LootDropType, isChecked: boolean) => {
        const newTargetPrizes = { ...targetPrizes };
        if (isChecked) {
            delete newTargetPrizes[name];
        } else {
            newTargetPrizes[name] = { name, type };
        }
        setPreOwnedPrizes(newTargetPrizes);
    };

    const mainDropsSubjectToDuplicationRules = Object.values(session.lootTableUniqueDrops)
        .filter((drop) => drop.type === 'main')
        .filter((drop) => !drop.isSubstitute)
        .filter((drop) => drop.isSubjectToDuplicationRules)
        .toSorted((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

    const secondaryDropsSubjectToDuplicationRules = Object.values(session.lootTableUniqueDrops)
        .filter((drop) => drop.type === 'secondary')
        .filter((drop) => !drop.isSubstitute)
        .filter((drop) => drop.isSubjectToDuplicationRules)
        .toSorted((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

    const targettableMainDrops = Object.values(session.lootTableUniqueDrops)
        .filter((drop) => drop.type === 'main')
        .filter((drop) => !drop.isSubstitute)
        .toSorted((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

    const targettableSecondaryDrops = Object.values(session.lootTableUniqueDrops)
        .filter((drop) => drop.type === 'secondary')
        .filter((drop) => !drop.isSubstitute)
        .toSorted((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));

    const renderBody = () => {
        return (
            <ModalBody>
                {/*
                // TODO: When loading a user-made json config, validate the checksum with the session one
                <Button variant="outline-primary" onClick={() => onApplySettings(newConfig)}>
                    <span className="d-none d-md-inline">Download </span>
                    <BsDownload />
                </Button>
                <Button variant="outline-primary" onClick={() => onApplySettings(newConfig)}>
                    <span className="d-none d-md-inline">Upload </span>
                    <BsUpload />
                </Button>
                */}
                <Container className="d-flex flex-column gap-4 p-0 overflow-y-auto">
                    <Container>
                        <FormLabel>Opening mode</FormLabel>
                        <InputGroup>
                            <FormSelect
                                value={openingMode}
                                onChange={(e) =>
                                    setOpeningMode(e.target.value as unknown as 'unlimited' | 'budget' | 'until')
                                }
                            >
                                <option value="unlimited">Unlimited</option>
                                <option value="budget">Budget</option>
                                <option value="until" disabled>
                                    Until...
                                </option>
                            </FormSelect>
                        </InputGroup>
                    </Container>
                    {mainDropsSubjectToDuplicationRules.length > 0 && (
                        <Container>
                            <FormLabel>Pre-owned main prizes</FormLabel>
                            <Row className="p-0">
                                {mainDropsSubjectToDuplicationRules.map((drop, idx) => (
                                    <Col key={`preOwnedMain_${idx}`} className="col-6 col-lg-3">
                                        <FormCheck
                                            type="checkbox"
                                            label={drop.name}
                                            checked={Object.keys(preOwnedPrizes).includes(drop.name)}
                                            onChange={(e) =>
                                                onCheckChangePreOwned(drop.name, drop.type, e.target.checked)
                                            }
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Container>
                    )}
                    {secondaryDropsSubjectToDuplicationRules.length > 0 && (
                        <Container>
                            <FormLabel>Pre-owned secondary prizes</FormLabel>
                            <Row className="p-0">
                                {secondaryDropsSubjectToDuplicationRules.map((drop, idx) => (
                                    <Col key={`preOwnedSec_${idx}`} className="col-6 col-lg-3">
                                        <FormCheck
                                            type="checkbox"
                                            label={drop.name}
                                            checked={Object.keys(preOwnedPrizes).includes(drop.name)}
                                            onChange={(e) =>
                                                onCheckChangePreOwned(drop.name, drop.type, e.target.checked)
                                            }
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Container>
                    )}
                    {openingMode === 'until' && targettableMainDrops.length > 0 && (
                        <Container>
                            <FormLabel>Main prizes opening goal</FormLabel>
                            <Row className="p-0">
                                {targettableMainDrops.map((drop, idx) => (
                                    <Col key={`targetMain_${idx}`} className="col-6 col-lg-3">
                                        <FormCheck
                                            type="checkbox"
                                            label={drop.name}
                                            checked={Object.keys(targetPrizes).includes(drop.name)}
                                            onChange={(e) =>
                                                onCheckChangeTarget(drop.name, drop.type, e.target.checked)
                                            }
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Container>
                    )}
                    {openingMode === 'until' && targettableSecondaryDrops.length > 0 && (
                        <Container>
                            <FormLabel>Secondary prizes opening goal</FormLabel>
                            <Row className="p-0">
                                {targettableSecondaryDrops.map((drop, idx) => (
                                    <Col key={`targetSec_${idx}`} className="col-6 col-lg-3">
                                        <FormCheck
                                            type="checkbox"
                                            label={drop.name}
                                            checked={Object.keys(targetPrizes).includes(drop.name)}
                                            onChange={(e) =>
                                                onCheckChangeTarget(drop.name, drop.type, e.target.checked)
                                            }
                                        />
                                    </Col>
                                ))}
                            </Row>
                        </Container>
                    )}
                </Container>
            </ModalBody>
        );
    };

    const renderFooter = () => {
        return (
            <ModalFooter>
                <Col className="col-auto">
                    <Button variant="danger" onClick={() => onApplyConfig(session.simulatorConfig)}>
                        Reset<span className="d-none d-md-inline"> session</span>
                    </Button>
                </Col>
                <Col className="flex-grow-1" />
                <Col className="col-auto">
                    <Button variant="secondary" onClick={onCloseSettingsModal}>
                        Cancel
                    </Button>
                </Col>
                <Col className="col-auto">
                    <Button variant="primary" onClick={applyConfig}>
                        Apply<span className="d-none d-md-inline"> and reset session</span>
                    </Button>
                </Col>
            </ModalFooter>
        );
    };

    return (
        <Modal size="xl" scrollable show={displaySettingsModal} onHide={onCloseSettingsModal}>
            <ModalHeader closeButton>
                <ModalTitle>Session settings</ModalTitle>
            </ModalHeader>
            {renderBody()}
            {renderFooter()}
        </Modal>
    );
}
