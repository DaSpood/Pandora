import type { OpeningSession, SessionConfiguration } from '../../types/state';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from 'react-bootstrap';

export default function SettingsModal({
    session,
    displaySettingsModal,
    onCloseSettingsModal,
    onApplySettings,
}: {
    session: OpeningSession;
    displaySettingsModal: boolean;
    onCloseSettingsModal: () => void;
    onApplySettings: (simulatorConfig: SessionConfiguration) => void;
}) {
    // TODO: When loading a user-generated json config becomes possible, validate the config checksum with the session one
    return (
        <Modal show={displaySettingsModal} onHide={onCloseSettingsModal}>
            <ModalHeader closeButton>
                <ModalTitle>Session settings</ModalTitle>
            </ModalHeader>
            <ModalBody>
                <Button variant="danger" onClick={() => onApplySettings(session.simulatorConfig)}>
                    Reset session
                </Button>
            </ModalBody>
            <ModalFooter>
                <Button variant="secondary" onClick={onCloseSettingsModal}>
                    Cancel
                </Button>
                <Button variant="primary" disabled>
                    Save changes
                </Button>
            </ModalFooter>
        </Modal>
    );
}
