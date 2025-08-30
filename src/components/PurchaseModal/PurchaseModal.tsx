import type { OpeningSession } from '../../types/state';
import {
    Button,
    Col,
    Container,
    FormCheck,
    FormControl,
    Image,
    ListGroup,
    ListGroupItem,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from 'react-bootstrap';
import { useEffect, useState } from 'react';
import type { Lootbox } from '../../types/lootTable';

export default function PurchaseModal({
    session,
    displayPurchaseModal,
    onClosePurchaseModal,
    onPurchase,
}: {
    session: OpeningSession;
    displayPurchaseModal: boolean;
    onClosePurchaseModal: () => void;
    onPurchase: (purchases: Record<string, number>) => void;
}) {
    const [displayNonPurchasable, setDisplayNonPurchasable] = useState<boolean>(false);
    const [purchases, setPurchases] = useState<Record<string, number>>({});

    useEffect(() => {
        setPurchases(
            session.referenceLootTable.lootboxes.reduce(
                (acc: Record<string, number>, lootbox: Lootbox) => {
                    acc[lootbox.name] = 0;
                    return acc;
                },
                {} as Record<string, number>,
            ),
        );
    }, [session]);

    const onChange = (lootboxName: string, newAmount: number) => {
        if (newAmount < 0) return;
        const newCart = { ...purchases };
        newCart[lootboxName] = newAmount;
        setPurchases(newCart);
    };

    const purchase = async () => {
        onPurchase(purchases);
        onClosePurchaseModal();
    };

    return (
        <Modal show={displayPurchaseModal} onHide={onClosePurchaseModal}>
            <ModalHeader closeButton>
                <ModalTitle>Purchase boxes</ModalTitle>
            </ModalHeader>
            <ModalBody>
                <Container className="d-flex flex-column gap-4 p-0 overflow-y-auto">
                    {!session.referenceLootTable.autoOpenRecursive && (
                        <FormCheck
                            type="switch"
                            label="Show non-purchasable lootboxes"
                            checked={displayNonPurchasable}
                            onChange={(e) => setDisplayNonPurchasable(e.target.checked)}
                        />
                    )}
                    <ListGroup>
                        {session.referenceLootTable.lootboxes
                            .filter((lootbox: Lootbox) => (displayNonPurchasable ? true : lootbox.purchasable))
                            .map((lootbox: Lootbox, idx: number) => (
                                <ListGroupItem
                                    key={idx}
                                    className="d-flex flex-row justify-content-between text-center p-2"
                                >
                                    <Col className="col-2">
                                        <Image
                                            src={lootbox.pictureUrl || 'default-loot-box.png'}
                                            alt={lootbox.name}
                                            className="object-fit-contain flex-grow-1 w-100 h-100"
                                        />
                                    </Col>
                                    <Col className="flex-grow-1 d-flex flex-column justify-content-center">
                                        <p>{lootbox.name}</p>
                                    </Col>
                                    <Col className="col-2 d-flex flex-column justify-content-center">
                                        <FormControl
                                            type="number"
                                            value={
                                                Object.keys(purchases).includes(lootbox.name)
                                                    ? purchases[lootbox.name]
                                                    : 0
                                            }
                                            onChange={(e) =>
                                                onChange(lootbox.name, e.target.value as unknown as number)
                                            }
                                        />
                                    </Col>
                                </ListGroupItem>
                            ))}
                    </ListGroup>
                </Container>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClosePurchaseModal}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={purchase}>
                    Confirm
                </Button>
            </ModalFooter>
        </Modal>
    );
}
