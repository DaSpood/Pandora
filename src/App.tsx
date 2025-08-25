import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useState } from 'react';
import type { OpeningSession, SessionConfiguration } from './types/state';
import type { Maybe } from './types/utils';
import { Container } from 'react-bootstrap';
import { newSession, openOneAndUpdateState } from './scripts/openingSessionManager.ts';
import type { Lootbox } from './types/lootTable';
import InfoHeader from './components/InfoHeader/InfoHeader.tsx';
import ButtonsFooter from './components/ButtonsFooter/ButtonsFooter.tsx';
import LootboxSelector from './components/LootboxSelector/LootboxSelector.tsx';
import ResultDisplay from './components/ResultDisplay/ResultDisplay.tsx';
import StatsLeftPanel from './components/StatsLeftPanel/StatsLeftPanel.tsx';
import HistoryRightPanel from './components/HistoryRightPanel/HistoryRightPanel.tsx';
import SettingsModal from './components/SettingsModal/SettingsModal.tsx';
import PurchaseModal from './components/PurchaseModal/PurchaseModal.tsx';

export default function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);
    const [selectedLootboxName, setSelectedLootboxName] = useState<string>('');
    const [showStats, setShowStats] = useState<boolean>(false);
    const [showHistory, setShowHistory] = useState<boolean>(false);
    const [showPurchase, setShowPurchase] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ACTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Reinitialize the state's session using the given LootTable and SessionConfiguration */
    const initSession = (rawTable: string, checksum: string, simulatorConfig?: SessionConfiguration): void => {
        const initialSession = newSession(rawTable, checksum);
        if (simulatorConfig) {
            initialSession.simulatorConfig = simulatorConfig;
            // TODO: update other fields as needed
        }
        console.log('Initialized session:', initialSession);
        setSession(initialSession);

        // Reset UI state
        setSelectedLootboxName(
            initialSession.referenceLootTable.lootboxes.filter((box: Lootbox) => box.purchasable)[0].name,
        );
        setShowStats(false);
        setShowHistory(false);
        setShowPurchase(false);
        setShowSettings(false);
    };

    const openSelectedLootbox = () => {
        if (!session) return;
        const selectedBox = selectedLootboxName || session?.referenceLootTable.lootboxes[0].name;

        // Costly but necessary for the session that's displayed. Won't clone every opening for auto sessions
        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;

        // If no box left in the inventory, purchase a new one.
        // Note: works for now, maybe we'll want to only enable the 'open' button if there is inventory, and add a
        //  purchase button for refills. And only bypass the restriction if a specific setting is enabled.
        if (passedState.lootboxPendingCounters[selectedBox] === 0) {
            if (session.simulatorConfig.openingMode === 'unlimited') {
                passedState.lootboxPurchasedCounters[selectedBox]++;
                passedState.lootboxPendingCounters[selectedBox]++;
            } else {
                console.error(
                    'Invalid state: "Open" button should be disabled if no boxes in inventory and not "unlimited" mode',
                );
                return;
            }
        }

        const newState = openOneAndUpdateState(passedState, selectedBox);
        setSession(newState);
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // CALLBACKS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const onApplySimulatorConfig = (simulatorConfig: SessionConfiguration): void =>
        initSession(JSON.stringify(session!.referenceLootTable), simulatorConfig.lootTableChecksum, simulatorConfig);

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

    const onOpenStatsPanel = () => setShowStats(true);

    const onCloseStatsPanel = () => setShowStats(false);

    const onOpenHistoryPanel = () => setShowHistory(true);

    const onCloseHistoryPanel = () => setShowHistory(false);

    const onOpenPurchaseModal = () => setShowPurchase(true);

    const onClosePurchaseModal = () => setShowPurchase(false);

    const onOpenSettingsModal = () => setShowSettings(true);

    const onCloseSettingsModal = () => setShowSettings(false);

    const onSelectedLootboxNameChanged = (newName: string) => setSelectedLootboxName(newName);

    const onOpenSelectedLootbox = () => openSelectedLootbox();

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // MAIN LAYOUT RENDER
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    return (
        <>
            {!session && <LootTableLoader onTableLoaded={onTableLoaded} />}
            {session && (
                <Container fluid className="d-flex flex-column h-100 p-0 m-0">
                    {/* Static layout */}
                    <Container fluid className="d-flex align-items-center">
                        <InfoHeader
                            session={session}
                            onOpenStatsPanel={onOpenStatsPanel}
                            onOpenHistoryPanel={onOpenHistoryPanel}
                        />
                    </Container>
                    <Container fluid className="d-flex align-items-center flex-grow-1">
                        <ResultDisplay session={session} />
                    </Container>
                    <Container fluid className="d-flex align-items-center">
                        <LootboxSelector
                            session={session}
                            selectedLootboxName={selectedLootboxName}
                            onSelectedLootboxNameChanged={onSelectedLootboxNameChanged}
                        />
                    </Container>
                    <Container fluid className="d-flex align-items-center">
                        <ButtonsFooter
                            session={session}
                            selectedLootboxName={selectedLootboxName}
                            onOpenPurchaseModal={onOpenPurchaseModal}
                            onOpenSettingsModal={onOpenSettingsModal}
                            onOpenSelectedLootbox={onOpenSelectedLootbox}
                        />
                    </Container>
                    {/* Dynamic layout */}
                    <StatsLeftPanel
                        session={session}
                        displayStatsPanel={showStats}
                        onCloseStatsPanel={onCloseStatsPanel}
                    />
                    <HistoryRightPanel
                        session={session}
                        displayHistoryPanel={showHistory}
                        onCloseHistoryPanel={onCloseHistoryPanel}
                    />
                    <PurchaseModal
                        session={session}
                        displayPurchaseModal={showPurchase}
                        onClosePurchaseModal={onClosePurchaseModal}
                    />
                    <SettingsModal
                        session={session}
                        displaySettingsModal={showSettings}
                        onCloseSettingsModal={onCloseSettingsModal}
                        onApplySettings={onApplySimulatorConfig}
                    />
                </Container>
            )}
        </>
    );
}
