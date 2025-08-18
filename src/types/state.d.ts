import type { LootDropType } from './lootTable';

/**
 * The interface holding the state of an opening session in the simulator.
 */
interface OpeningSession {
    /**
     * The LootTable loaded for this session.
     *
     * This LootTable must not be altered, as it will serve as a reference for resets.
     */
    referenceLootTable: LootTable;
    /**
     * The LootTable currently used by the opening algorithm, initialized as a deep copy of `referenceLootTable`.
     *
     * Compared to the reference, drop rates and content may have been altered as the session progresses and pity or
     * duplication handling takes place.
     */
    dynamicLootTable: LootTable;
    /**
     * Cache associating each LootDrop's name with the corresponding full object in the `referenceLootTable`.
     *
     * The goal here is to allow easy access when displaying filters to the user (mainly for selecting pre-owned
     * main/secondary drops and setting the stop-condition of the "open until" mode) or accessing pictures.
     */
    lootTableDrops: Record<string, LootDrop>;
    /**
     * For each Lootbox's name, how many boxes have been opened during the session.
     */
    lootboxCounters: Record<string, number>;
    /**
     * For each Lootbox's name, the current pity counter of the main and secondary prize.
     */
    pityCounters: Record<string, { mainPity: number; secondaryPity: number }>;
    /**
     * For each LootDrop's name, the total amount obtained during the session.
     *
     * This will be updated as the session goes to allow for quick access in the UI. Other more specific session stats
     * will need to be computed as requested using the `history`.
     */
    aggregatedResults: Record<string, number>;
    /**
     * The complete history of all box opening results in this session
     */
    history: OpeningResult[];
    /**
     * The current configuration of the session.
     *
     * The attributes of this field will be updated as the user prepares the session in the UI, and can be exported.
     *
     * The session can also be initialized with an existing config to change the default value of some fields. This is
     * especially useful for automating "budget" or "until" simulator sessions.
     */
    simulatorConfig: SessionConfiguration;
}

/**
 * Result of a single box opening with metadata for historization.
 */
export interface OpeningResult {
    /** Box opening counter for the session */
    openingNumber: number;
    /** Unique name of the Lootbox that was opened */
    boxName: string;
    /** Box opening counter for this specific Lootbox */
    boxOpeningNumber: number;
    /** Whether main prize hard pity was reached with this box */
    mainHardPityReached: boolean;
    /** Whether secondary prize hard pity was reached with this box */
    secondaryHardPityReached: boolean;
    /** The list of drops obtained in this box */
    drops: OpeningResultDrop[];
}

/**
 * Simplified form of a LootDrop obtained in an opened box.
 */
export interface OpeningResultDrop {
    /** Content type of the LootDrop's parent LootSlot (for pity handling) */
    type: LootDropType;
    /** Name of the LootDrop */
    name: string;
    /** Amount dropped */
    amount: number;
}

/**
 * The configuration of an opening session.
 *
 * It describes what "mode" the simulator runs on, what drops to pre-exclude from duplications, etc.
 */
export interface SessionConfiguration {
    /**
     * A SHA256 checksum of the LootTable that was loaded when this config was made.
     *
     * To allow re-using configs for different LootTables, the checksum will not be blocking (initial state will be set
     * with a "replace if exists" approach), but will cause a warning in the UI if the config contains data related to
     * LootDrops and pity.
     */
    lootTableChecksum: string;

    // `slowOpening: boolean` for auto-opening modes to display each result in the UI with a slight delay or only display final results?
}
