import type { OpeningSession } from '../../types/state';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap';

export default function PurchaseModal({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    session,
    displayPurchaseModal,
    onClosePurchaseModal,
}: {
    session: OpeningSession;
    displayPurchaseModal: boolean;
    onClosePurchaseModal: () => void;
}) {
    return (
        <Modal show={displayPurchaseModal} onHide={onClosePurchaseModal}>
            <ModalHeader closeButton>
                <ModalTitle>Purchase boxes</ModalTitle>
            </ModalHeader>
            <ModalBody>
                <p>TODO</p>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onClosePurchaseModal}>
                    Cancel
                </Button>
                <Button variant="primary" disabled>
                    Save changes
                </Button>
            </ModalFooter>
        </Modal>
    );
}
