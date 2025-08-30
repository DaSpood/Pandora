import type { OpeningSession } from '../../types/state';
import {
    Button,
    ButtonGroup,
    Col,
    Container,
    Dropdown,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    Row,
} from 'react-bootstrap';
import { BsCartPlus, BsGear } from 'react-icons/bs';

export default function ButtonsFooter({
    session,
    selectedLootboxName,
    currentlyAutoOpening,
    currentlyOpeningAll,
    currentlySimulating,
    onOpenPurchaseModal,
    onOpenSettingsModal,
    onOpenSelectedLootbox,
    onAutoOpen,
    onStopAutoOpen,
    onOpenAll,
    onSimulate,
}: {
    session: OpeningSession;
    selectedLootboxName: string;
    currentlyAutoOpening: boolean;
    currentlyOpeningAll: boolean;
    currentlySimulating: boolean;
    onOpenPurchaseModal: () => void;
    onOpenSettingsModal: () => void;
    onOpenSelectedLootbox: () => void;
    onAutoOpen: () => void;
    onStopAutoOpen: () => void;
    onOpenAll: () => void;
    onSimulate: () => void;
}) {
    const getOpenButtonLabel = (): string => {
        if (session.simulatorConfig.openingMode === 'until' && currentlySimulating) return 'Simulating...';
        if (session.simulatorConfig.openingMode === 'until' && !currentlySimulating) return 'Simulate';
        if (currentlyOpeningAll) return 'Opening...';
        if (currentlyAutoOpening) return 'Stop';
        return 'Open';
    };

    const getOpenButtonAction = (): (() => void) => {
        if (session.simulatorConfig.openingMode === 'until') return onSimulate;
        if (currentlyAutoOpening) return onStopAutoOpen;
        return onOpenSelectedLootbox;
    };

    return (
        <Container fluid className="py-2 px-0">
            <Row className="d-flex justify-content-center">
                <Col
                    className={`col-auto ${session.simulatorConfig.openingMode === 'budget' ? 'visible' : 'invisible'}`}
                >
                    <Button
                        variant="outline-primary"
                        type="button"
                        onClick={onOpenPurchaseModal}
                        className="icon-button"
                        disabled={currentlyAutoOpening || currentlyOpeningAll}
                    >
                        <BsCartPlus />
                    </Button>
                </Col>
                <Col className="col-4 d-inline-flex">
                    <Dropdown as={ButtonGroup} className="w-100">
                        <Button
                            variant="primary"
                            type="button"
                            onClick={getOpenButtonAction()}
                            className="w-100"
                            disabled={
                                currentlyOpeningAll ||
                                currentlySimulating ||
                                (!currentlyAutoOpening &&
                                    session.lootboxPendingCounters[selectedLootboxName] === 0 &&
                                    session.simulatorConfig.openingMode === 'budget')
                            }
                        >
                            {getOpenButtonLabel()}
                        </Button>
                        {session.simulatorConfig.openingMode === 'budget' &&
                            !currentlyAutoOpening &&
                            !currentlyOpeningAll && (
                                <>
                                    <DropdownToggle
                                        disabled={
                                            Object.values(session.lootboxPendingCounters).reduce(
                                                (acc, val) => acc + val,
                                                0,
                                            ) === 0
                                        }
                                    />
                                    <DropdownMenu>
                                        <DropdownItem onClick={onAutoOpen}>Auto-open 1 by 1</DropdownItem>
                                        <DropdownItem onClick={onOpenAll}>Auto-open everything</DropdownItem>
                                    </DropdownMenu>
                                </>
                            )}
                    </Dropdown>
                </Col>
                <Col className="col-auto">
                    <Button
                        variant="outline-primary"
                        type="button"
                        onClick={onOpenSettingsModal}
                        className="icon-button"
                    >
                        <BsGear />
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}
