import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useEffect, useState } from 'react';
import type { OpeningSession, SessionConfiguration } from './types/state';
import type { Maybe } from './types/utils';
import { Container } from 'react-bootstrap';
import {
    findNextLootboxInInventory,
    handleDuplicationRules,
    newSession,
    openAllInInventory,
    openOneAndUpdateState,
} from './scripts/openingSessionManager.ts';
import type { Lootbox, LootDrop, LootGroup, LootSlot } from './types/lootTable';
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
    const [currentlyAutoOpening, setCurrentlyAutoOpening] = useState<boolean>(false);
    const [currentlyOpeningAll, setCurrentlyOpeningAll] = useState<boolean>(false);
    const [currentlySimulating, setCurrentlySimulating] = useState<boolean>(false);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // BACKGROUND ACTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * "Auto-open 1 by 1" in `budget` mode will open one box and update the state every 1.5s until either the
     * auto-opening is disabled, the session is reset, or the inventory is empty.
     *
     * The delay is here to let the UI display the result every box. For instant clearing of the inventory, use the
     * "Auto-open everything" button instead.
     */
    useEffect(() => {
        let autoOpeningInterval: string | number | NodeJS.Timeout | undefined = undefined;
        if (session && currentlyAutoOpening) {
            autoOpeningInterval = setInterval(() => {
                const selectedBox = findNextLootboxInInventory(session);
                if (!selectedBox) {
                    setCurrentlyAutoOpening(false);
                    return;
                }
                const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;
                const newState = openOneAndUpdateState(passedState, selectedBox);
                setSession(newState);
            }, 1_500);
        } else {
            clearInterval(autoOpeningInterval);
        }
        return () => clearInterval(autoOpeningInterval);
    }, [currentlyAutoOpening, session]);

    /**
     * "Auto-open everything" in `budget` mode will open every box remaining in the inventory, including ones that may
     * be obtained during the opening process.
     *
     * The UI will lock until the process is complete. For a "1 by 1" auto-opening that can be interrupted, use the
     * "Auto-open 1 by 1" button instead.
     */
    useEffect(() => {
        if (session && currentlyOpeningAll) {
            const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;
            const newState = openAllInInventory(passedState);
            setSession(newState);
            setCurrentlyOpeningAll(false);
            setShowStats(true); // Don't want to do a special result screen so show the stats instead.
        }
    }, [currentlyOpeningAll, session]);

    /**
     * TODO
     * Simulation in `until` mode will keep auto-purchasing and opening boxes until the target drops are obtained.
     *
     * The UI will lock until the process is complete.
     */
    useEffect(() => {
        let simulationTimeout: string | number | NodeJS.Timeout | undefined;
        if (currentlySimulating) {
            simulationTimeout = setTimeout(() => {
                console.log('simulationTimeout');
                setCurrentlySimulating(false);
            }, 10_000);
        } else {
            clearTimeout(simulationTimeout);
        }
        return () => clearTimeout(simulationTimeout);
    }, [currentlySimulating]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // DIRECT ACTIONS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** Reinitialize the state's session using the given LootTable and SessionConfiguration */
    const initSession = (rawTable: string, checksum: string, simulatorConfig?: SessionConfiguration): void => {
        const initialSession = newSession(rawTable, checksum);
        if (simulatorConfig) {
            initialSession.simulatorConfig = simulatorConfig;
            // Apply duplication rules on pre-owned content
            initialSession.dynamicLootTable.lootboxes.forEach((lootbox: Lootbox) => {
                // Main prizes
                const refMainLootGroup: LootGroup = initialSession.referenceLootTable.lootboxes
                    .find((box: Lootbox) => box.name === lootbox.name)!
                    .lootSlots.find((slot: LootSlot) => slot.contentType === 'main')!.lootGroups[0];
                const availableMainPrizesInBox = refMainLootGroup.lootDrops.map((drop: LootDrop) => drop.name);
                const dynamicMainLootGroup = lootbox.lootSlots.find((slot) => slot.contentType === 'main')!
                    .lootGroups[0];
                simulatorConfig.preOwnedPrizes
                    .filter((prize) => prize.type === 'main')
                    .map((prize) => prize.name)
                    .filter((prize) => availableMainPrizesInBox.includes(prize))
                    .forEach((prize) => {
                        lootbox.mainPrizeDuplicates = handleDuplicationRules(
                            prize,
                            refMainLootGroup,
                            dynamicMainLootGroup,
                            lootbox.mainPrizeDuplicates,
                            lootbox.mainPrizeSubstitute,
                        );
                    });
                // Secondary prizes
                const refSecondaryLootGroup = initialSession.referenceLootTable.lootboxes
                    .find((box: Lootbox) => box.name === lootbox.name)!
                    .lootSlots.find((slot: LootSlot) => slot.contentType === 'secondary')?.lootGroups[0];
                const availableSecondaryPrizesInBox = refMainLootGroup.lootDrops.map((drop: LootDrop) => drop.name);
                const dynamicSecondaryLootGroup = lootbox.lootSlots.find((slot) => slot.contentType === 'secondary')
                    ?.lootGroups[0];
                simulatorConfig.preOwnedPrizes
                    .filter((prize) => prize.type === 'secondary')
                    .map((prize) => prize.name)
                    .filter((prize) => availableSecondaryPrizesInBox.includes(prize))
                    .forEach((prize) => {
                        lootbox.mainPrizeDuplicates = handleDuplicationRules(
                            prize,
                            refSecondaryLootGroup,
                            dynamicSecondaryLootGroup!,
                            lootbox.secondaryPrizeDuplicates,
                            lootbox.secondaryPrizeSubstitute,
                        );
                    });
            });
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
        setCurrentlyAutoOpening(false);
        setCurrentlySimulating(false);
    };

    const openSelectedLootbox = () => {
        if (!session) return;
        const selectedBox = selectedLootboxName || session?.referenceLootTable.lootboxes[0].name;

        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;

        // Auto-purchase new box in 'unlimited' mode.
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
    // ACTION CALLBACKS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

    const onApplySimulatorConfig = (simulatorConfig?: SessionConfiguration): void =>
        initSession(
            JSON.stringify(session!.referenceLootTable),
            simulatorConfig?.lootTableChecksum || session!.simulatorConfig.lootTableChecksum,
            simulatorConfig,
        );

    const onPurchase = (purchases: Record<string, number>) => {
        const newPurchased = JSON.parse(JSON.stringify(session!.lootboxPurchasedCounters)) as Record<string, number>;
        const newPending = JSON.parse(JSON.stringify(session!.lootboxPendingCounters)) as Record<string, number>;

        Object.keys(purchases).forEach((lootboxName) => {
            // This fuckass language recognizes purchases[lootboxName] as a number but still defaults to a string concat
            newPurchased[lootboxName] += Number(purchases[lootboxName]);
            newPending[lootboxName] += Number(purchases[lootboxName]);
        });
        setSession((prevState) => ({
            ...prevState!,
            lootboxPurchasedCounters: newPurchased,
            lootboxPendingCounters: newPending,
        }));
    };

    const onSelectedLootboxNameChanged = (newName: string) => setSelectedLootboxName(newName);

    const onOpenSelectedLootbox = () => openSelectedLootbox();

    const onAutoOpen = () => setCurrentlyAutoOpening(true);

    const onStopAutoOpen = () => setCurrentlyAutoOpening(false);

    const onOpenAll = () => setCurrentlyOpeningAll(true);

    const onSimulate = () => setCurrentlySimulating(true);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // LAYOUT CALLBACKS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const onOpenStatsPanel = () => setShowStats(true);

    const onCloseStatsPanel = () => setShowStats(false);

    const onOpenHistoryPanel = () => setShowHistory(true);

    const onCloseHistoryPanel = () => setShowHistory(false);

    const onOpenPurchaseModal = () => setShowPurchase(true);

    const onClosePurchaseModal = () => setShowPurchase(false);

    const onOpenSettingsModal = () => setShowSettings(true);

    const onCloseSettingsModal = () => setShowSettings(false);

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
                            locked={currentlyAutoOpening || currentlyOpeningAll || currentlySimulating}
                        />
                    </Container>
                    <Container fluid className="d-flex align-items-center">
                        <ButtonsFooter
                            session={session}
                            selectedLootboxName={selectedLootboxName}
                            currentlyAutoOpening={currentlyAutoOpening}
                            currentlyOpeningAll={currentlyOpeningAll}
                            currentlySimulating={currentlySimulating}
                            onOpenPurchaseModal={onOpenPurchaseModal}
                            onOpenSettingsModal={onOpenSettingsModal}
                            onOpenSelectedLootbox={onOpenSelectedLootbox}
                            onAutoOpen={onAutoOpen}
                            onStopAutoOpen={onStopAutoOpen}
                            onOpenAll={onOpenAll}
                            onSimulate={onSimulate}
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
                        onPurchase={onPurchase}
                    />
                    <SettingsModal
                        session={session}
                        displaySettingsModal={showSettings}
                        onCloseSettingsModal={onCloseSettingsModal}
                        onApplyConfig={onApplySimulatorConfig}
                    />
                </Container>
            )}
        </>
    );
}
