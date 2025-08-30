import type { OpeningSession, SessionConfiguration } from '../../types/state';
import {
    Accordion,
    AccordionBody,
    AccordionHeader,
    AccordionItem,
    Alert,
    AlertHeading,
    Button,
    Col,
    Container,
    FormCheck,
    FormControl,
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
import { type ChangeEvent, useEffect, useState } from 'react';
import type { LootDropType } from '../../types/lootTable';
import type { Maybe } from '../../types/utils';

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
        session.simulatorConfig.openingMode ?? 'unlimited',
    );
    const [preOwnedPrizes, setPreOwnedPrizes] = useState<Record<string, { name: string; type: LootDropType }>>({});
    const [targetPrizes, setTargetPrizes] = useState<Record<string, { name: string; type: LootDropType }>>({});
    const [threads, setThreads] = useState<number>(1);
    const [iterationsPerThread, setIterationsPerThread] = useState<number>(1);
    const [displayChecksumMismatchWarnings, setDisplayChecksumMismatchWarnings] = useState<boolean>(false);
    const [uploadedConfig, setUploadedConfig] = useState<Maybe<File>>(undefined);

    useEffect(() => {
        setOpeningMode(session.simulatorConfig.openingMode ?? 'unlimited');
        setThreads(Math.abs(session.simulatorConfig.simulatorThreads ?? 0) || 1);
        setIterationsPerThread(Math.abs(session.simulatorConfig.simulatorIterationsPerThread ?? 0) || 1);

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

    const loadUploadedConfig = () => {
        if (!uploadedConfig) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            const loadedConfig = JSON.parse(reader.result?.toString() ?? '{}') as SessionConfiguration;
            if (loadedConfig.lootTableChecksum !== session.simulatorConfig.lootTableChecksum) {
                setDisplayChecksumMismatchWarnings(true);
            }

            setOpeningMode(loadedConfig.openingMode ?? 'unlimited');
            setThreads(Math.abs(loadedConfig.simulatorThreads ?? 0) || 1);
            setIterationsPerThread(Math.abs(loadedConfig.simulatorIterationsPerThread ?? 0) || 1);

            const acceptedDropNames: string[] = Object.values(session.lootTableUniqueDrops)
                .filter((drop) => drop.type !== 'filler')
                .map((drop) => drop.name);
            const loadedPreOwnedPrizes = loadedConfig.preOwnedPrizes.reduce(
                (acc, prize) => {
                    acc[prize.name] = { name: prize.name, type: prize.type };
                    return acc;
                },
                {} as Record<string, { name: string; type: LootDropType }>,
            );
            Object.keys(loadedPreOwnedPrizes)
                .filter((key) => !acceptedDropNames.includes(key))
                .forEach((key) => {
                    delete loadedPreOwnedPrizes[key];
                });
            setPreOwnedPrizes(loadedPreOwnedPrizes);

            const loadedTargetPrizes = loadedConfig.targetPrizes.reduce(
                (acc, prize) => {
                    acc[prize.name] = { name: prize.name, type: prize.type };
                    return acc;
                },
                {} as Record<string, { name: string; type: LootDropType }>,
            );
            Object.keys(loadedTargetPrizes)
                .filter((key) => !acceptedDropNames.includes(key))
                .forEach((key) => {
                    delete loadedTargetPrizes[key];
                });
            setTargetPrizes(loadedTargetPrizes);
        };
        reader.readAsText(uploadedConfig);
    };

    const applyConfig = () => {
        const newConfig = JSON.parse(JSON.stringify(session.simulatorConfig)) as SessionConfiguration;
        newConfig.openingMode = openingMode;
        newConfig.preOwnedPrizes = Object.values(preOwnedPrizes);
        newConfig.targetPrizes = Object.values(targetPrizes);
        newConfig.simulatorThreads = threads;
        newConfig.simulatorIterationsPerThread = iterationsPerThread;
        onApplyConfig(newConfig);
    };

    const onExportConfig = () => {
        const blob = new Blob([JSON.stringify(session.simulatorConfig, null, 2)], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = 'pandora_config.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
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
            newTargetPrizes[name] = { name, type };
        } else {
            delete newTargetPrizes[name];
        }
        setTargetPrizes(newTargetPrizes);
    };

    const onChangeThreads = (value: number) => {
        if (value < 1) {
            setThreads(1);
        } else {
            setThreads(value);
        }
    };

    const onChangeIterationsPerThread = (value: number) => {
        if (value < 1) {
            setIterationsPerThread(1);
        } else {
            setIterationsPerThread(value);
        }
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
                {displayChecksumMismatchWarnings && (
                    <Alert variant="warning" onClose={() => setDisplayChecksumMismatchWarnings(false)} dismissible>
                        <AlertHeading>Loot table mismatch</AlertHeading>
                        <p>
                            The configuration you loaded was created for a different loot table. Compatible settings
                            were loaded, but some may have been skipped.
                        </p>
                    </Alert>
                )}
                <Container className="d-flex flex-column gap-4 p-0 overflow-y-auto">
                    {/*Import/export buttons*/}
                    <Container className="d-flex flex-column flex-md-row gap-2 justify-content-center">
                        <Col className="col-auto">
                            <Button variant="primary" onClick={onExportConfig}>
                                Download{' '}
                                <b>
                                    <u>active</u>
                                </b>{' '}
                                config
                            </Button>
                        </Col>
                        <Col className="col-auto">
                            <InputGroup>
                                <FormControl
                                    type="file"
                                    accept=".json"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        setUploadedConfig(e.target.files?.[0])
                                    }
                                />
                                <Button
                                    variant="primary"
                                    type="button"
                                    disabled={!uploadedConfig}
                                    onClick={() => loadUploadedConfig()}
                                >
                                    Upload config
                                </Button>
                            </InputGroup>
                        </Col>
                    </Container>
                    {/*Opening mode selector*/}
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
                                <option value="until">Until...</option>
                            </FormSelect>
                        </InputGroup>
                    </Container>
                    {/* Multithreading params for "until" mode */}
                    {openingMode === 'until' && (
                        <Container>
                            <Accordion>
                                <AccordionItem eventKey="0">
                                    <AccordionHeader>Simulator settings</AccordionHeader>
                                    <AccordionBody className="d-flex flex-column gap-2">
                                        <InputGroup className="d-flex flex-row justify-content-start text-start">
                                            <Col className="col-auto col-md-3 d-flex flex-column justify-content-center">
                                                <FormLabel>Parallel instances:</FormLabel>
                                            </Col>
                                            <Col className="col-1 d-md-none flex-grow-1 flex-md-grow-0" />
                                            <Col className="col-2 col-md-1 d-flex flex-column justify-content-center">
                                                <FormControl
                                                    type="number"
                                                    value={threads}
                                                    onChange={(e) =>
                                                        onChangeThreads(e.target.value as unknown as number)
                                                    }
                                                />
                                            </Col>
                                        </InputGroup>
                                        <InputGroup className="d-flex flex-row justify-content-start text-start">
                                            <Col className="col-auto col-md-3 d-flex flex-column justify-content-center gap-2">
                                                <FormLabel>Simulations per instance:</FormLabel>
                                            </Col>
                                            <Col className="col-1 d-md-none flex-grow-1 flex-md-grow-0" />
                                            <Col className="col-2 col-md-1 d-flex flex-column justify-content-center">
                                                <FormControl
                                                    type="number"
                                                    value={iterationsPerThread}
                                                    onChange={(e) =>
                                                        onChangeIterationsPerThread(e.target.value as unknown as number)
                                                    }
                                                />
                                            </Col>
                                        </InputGroup>
                                        <p className="text-muted">
                                            <i>
                                                Number of parallel instances should not exceed your CPU's core count for
                                                ideal performances.
                                            </i>
                                        </p>
                                    </AccordionBody>
                                </AccordionItem>
                            </Accordion>
                        </Container>
                    )}
                    {/*Main prize "until" goals*/}
                    {openingMode === 'until' && targettableMainDrops.length > 0 && (
                        <Container>
                            <Accordion defaultActiveKey="0">
                                <AccordionItem eventKey="0">
                                    <AccordionHeader>Main prizes opening goal</AccordionHeader>
                                    <AccordionBody>
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
                                    </AccordionBody>
                                </AccordionItem>
                            </Accordion>
                        </Container>
                    )}
                    {/*Secondary prize "until" goals*/}
                    {openingMode === 'until' && targettableSecondaryDrops.length > 0 && (
                        <Container>
                            <Accordion>
                                <AccordionItem eventKey="0">
                                    <AccordionHeader>Secondary prizes opening goal</AccordionHeader>
                                    <AccordionBody>
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
                                    </AccordionBody>
                                </AccordionItem>
                            </Accordion>
                        </Container>
                    )}
                    {/*Pre-owned main prizes*/}
                    {mainDropsSubjectToDuplicationRules.length > 0 && (
                        <Container>
                            <Accordion defaultActiveKey="0">
                                <AccordionItem eventKey="0">
                                    <AccordionHeader>Pre-owned main prizes</AccordionHeader>
                                    <AccordionBody>
                                        <Row className="p-0">
                                            {mainDropsSubjectToDuplicationRules.map((drop, idx) => (
                                                <Col key={`preOwnedMain_${idx}`} className="col-6 col-lg-3">
                                                    <FormCheck
                                                        type="checkbox"
                                                        label={drop.name}
                                                        checked={Object.keys(preOwnedPrizes).includes(drop.name)}
                                                        onChange={(e) =>
                                                            onCheckChangePreOwned(
                                                                drop.name,
                                                                drop.type,
                                                                e.target.checked,
                                                            )
                                                        }
                                                    />
                                                </Col>
                                            ))}
                                        </Row>
                                    </AccordionBody>
                                </AccordionItem>
                            </Accordion>
                        </Container>
                    )}
                    {/*Pre-owned secondary prizes*/}
                    {secondaryDropsSubjectToDuplicationRules.length > 0 && (
                        <Container>
                            <Accordion>
                                <AccordionItem eventKey="0">
                                    <AccordionHeader>Pre-owned secondary prizes</AccordionHeader>
                                    <AccordionBody>
                                        <Row className="p-0">
                                            {secondaryDropsSubjectToDuplicationRules.map((drop, idx) => (
                                                <Col key={`preOwnedSec_${idx}`} className="col-6 col-lg-3">
                                                    <FormCheck
                                                        type="checkbox"
                                                        label={drop.name}
                                                        checked={Object.keys(preOwnedPrizes).includes(drop.name)}
                                                        onChange={(e) =>
                                                            onCheckChangePreOwned(
                                                                drop.name,
                                                                drop.type,
                                                                e.target.checked,
                                                            )
                                                        }
                                                    />
                                                </Col>
                                            ))}
                                        </Row>
                                    </AccordionBody>
                                </AccordionItem>
                            </Accordion>
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
                    <Button
                        variant="primary"
                        onClick={applyConfig}
                        disabled={openingMode === 'until' && Object.keys(targetPrizes).length === 0}
                    >
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
