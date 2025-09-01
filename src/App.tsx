import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import LootTableLoader from './components/LootTableLoader/LootTableLoader.tsx';
import { useEffect, useState } from 'react';
import type { OpeningSession, SessionConfiguration } from './types/state';
import type { Maybe } from './types/utils';
import { Container } from 'react-bootstrap';
import {
    findNextLootboxInInventory,
    findSpecialSlotAndGroup,
    handleDuplicationRules,
    newSession,
    openAllInInventory,
    openOneAndUpdateState,
    openUntilOneIteration,
} from './scripts/openingSessionManager.ts';
import type { Lootbox, LootDrop, LootGroup } from './types/lootTable';
import InfoHeader from './components/InfoHeader/InfoHeader.tsx';
import ButtonsFooter from './components/ButtonsFooter/ButtonsFooter.tsx';
import LootboxSelector from './components/LootboxSelector/LootboxSelector.tsx';
import ResultDisplay from './components/ResultDisplay/ResultDisplay.tsx';
import StatsLeftPanel from './components/StatsLeftPanel/StatsLeftPanel.tsx';
import SettingsModal from './components/SettingsModal/SettingsModal.tsx';
import PurchaseModal from './components/PurchaseModal/PurchaseModal.tsx';

export default function App() {
    const [session, setSession] = useState<Maybe<OpeningSession>>(null);
    const [selectedLootboxName, setSelectedLootboxName] = useState<string>('');
    const [showStats, setShowStats] = useState<boolean>(false);
    const [showPurchase, setShowPurchase] = useState<boolean>(false);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [currentlyAutoOpening, setCurrentlyAutoOpening] = useState<boolean>(false);
    const [currentlyOpeningAll, setCurrentlyOpeningAll] = useState<boolean>(false);
    const [currentlySimulating, setCurrentlySimulating] = useState<boolean>(false);
    const [workers, setWorkers] = useState<Maybe<Worker>[]>([]);
    const [workerResults, setWorkersResults] = useState<Maybe<number[]>[]>([]);
    const [simulationResult, setSimulationResult] = useState<Maybe<number[]>>(undefined);

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
                const refMainLootSlotAndGroup = findSpecialSlotAndGroup(
                    initialSession.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === lootbox.name)!,
                    'main',
                )!;
                const refMainLootGroup: LootGroup =
                    refMainLootSlotAndGroup.group ?? refMainLootSlotAndGroup.slot.lootGroups[0];
                const availableMainPrizesInBox = refMainLootGroup.lootDrops.map((drop: LootDrop) => drop.name);
                const dynamicMainLootSlotAndGroup = findSpecialSlotAndGroup(lootbox, 'main')!;
                const dynamicMainLootGroup =
                    dynamicMainLootSlotAndGroup.group ?? dynamicMainLootSlotAndGroup.slot.lootGroups[0];
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
                const refSecondaryLootSlotAndGroup = findSpecialSlotAndGroup(
                    initialSession.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === lootbox.name)!,
                    'secondary',
                );
                if (refSecondaryLootSlotAndGroup) {
                    const refSecondaryLootGroup: LootGroup =
                        refSecondaryLootSlotAndGroup.group ?? refSecondaryLootSlotAndGroup.slot.lootGroups[0];
                    const availableSecondaryPrizesInBox = refSecondaryLootGroup.lootDrops.map(
                        (drop: LootDrop) => drop.name,
                    );
                    const dynamicSecondaryLootSlotAndGroup = findSpecialSlotAndGroup(lootbox, 'secondary')!;
                    const dynamicSecondaryLootGroup =
                        dynamicSecondaryLootSlotAndGroup.group ?? dynamicSecondaryLootSlotAndGroup.slot.lootGroups[0];
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
                }
            });
        }
        setSession(initialSession);

        // Reset UI state
        setSelectedLootboxName(
            initialSession.referenceLootTable.lootboxes.filter((box: Lootbox) => box.purchasable)[0].name,
        );
        setShowStats(false);
        setShowPurchase(false);
        setShowSettings(false);
        setCurrentlyAutoOpening(false);
        setCurrentlySimulating(false);
        setWorkers([]);
        setWorkersResults([]);
        setSimulationResult(undefined);
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

    const onOpenAll = () => {
        if (!session) return;

        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;
        const newState = openAllInInventory(passedState);
        setCurrentlyOpeningAll(false);
        setSession(newState);
        setShowStats(true);
    };

    const onSimulateOnce = () => {
        if (!session) return;

        const passedState = JSON.parse(JSON.stringify(session)) as OpeningSession;
        const newState = openUntilOneIteration(passedState);
        setCurrentlySimulating(false);
        setSession(newState);
        setShowStats(true);
    };

    const onSimulateMany = () => {
        if (!session) return;
        // Pre-allocate results to update them instead of pushing them as they come
        // The listener below will detect this allocation and start the workers
        const newWorkerResults = [];
        for (let i = 0; i < session.simulatorConfig.simulatorThreads; i++) {
            newWorkerResults.push(undefined);
        }
        setWorkersResults(newWorkerResults);
    };

    const onSimulate = () => {
        if (!session) return;
        setCurrentlySimulating(true);
        setSimulationResult(undefined);

        if (
            session.simulatorConfig.simulatorThreads === 1 &&
            session.simulatorConfig.simulatorIterationsPerThread === 1
        ) {
            onSimulateOnce();
        } else {
            onSimulateMany();
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // ACTION LISTENERS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Listener to "auto-open 1 by 1" in `budget` mode to start and stop the opening depending on the state.
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
     * Listener to `until` mode worker updates to stop the simulation and aggregate results once all workers are done.
     */
    useEffect(() => {
        if (!session || !currentlySimulating || !workers.length || !workerResults.length) return;

        // Filter out pre-allocated results
        const obtainedResults = workerResults.filter((result) => !!result);

        // Check that all workers have finished
        if (obtainedResults.length !== workers.length) return;

        // Stop simulation and aggregate
        setCurrentlySimulating(false);
        setWorkersResults([]);
        workers.forEach((worker) => worker?.terminate());
        setWorkers([]);
        setSimulationResult(
            obtainedResults
                .reduce((acc, result) => {
                    result.forEach((elt) => acc.push(elt));
                    return acc;
                }, [])
                .toSorted((a, b) => a - b),
        );
    }, [currentlySimulating, session, workerResults, workers]);

    /**
     * Listener to `until` mode state init to start the simulation once the state is ready to receive updates.
     */
    useEffect(() => {
        if (!session || !currentlySimulating || !workerResults.length || workers.length > 0) return;

        // Check for pre-allocation of results (all undefined)
        if (workerResults.filter((result) => result === undefined).length !== workerResults.length) return;

        // Worker update callback - declared here for readability, can't be outside of the useEffect though
        const onWorkerResult = (event: MessageEvent) => {
            const { workerId, result } = event.data;
            setWorkersResults((prevState) => {
                const newState = [...prevState];
                newState[workerId] = result;
                return newState;
            });
        };

        // Initialize workers
        const passedState = JSON.stringify(session);
        const newWorkers: Worker[] = [];
        for (let i = 0; i < session.simulatorConfig.simulatorThreads; i++) {
            const newWorker = new Worker(new URL('./scripts/openingWorker.ts', import.meta.url), { type: 'module' });
            newWorker.onmessage = onWorkerResult;
            newWorker.postMessage({
                rawInitialSession: passedState,
                iterations: session.simulatorConfig.simulatorIterationsPerThread,
                workerId: i,
            });
            newWorkers.push(newWorker);
        }
        setWorkers(newWorkers);
    }, [currentlySimulating, session, workerResults, workers]);

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    // LAYOUT CALLBACKS
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    const onOpenStatsPanel = () => setShowStats(true);

    const onCloseStatsPanel = () => setShowStats(false);

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
                        <InfoHeader session={session} onOpenStatsPanel={onOpenStatsPanel} />
                    </Container>
                    <Container fluid className="d-flex align-items-center flex-grow-1 overflow-y-auto">
                        <ResultDisplay session={session} simulationResult={simulationResult} />
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
