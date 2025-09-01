import type { Lootbox, LootDrop, LootDropSubstitute, LootDropType, LootGroup, LootSlot } from './lootTable';

/**
 * All the metadata of a "branch" of a loot table, associating each leaf (drop) with its chain of parent objects,
 * as well as some computed metadata to simplify checks.
 */
export interface LootTableBranch {
    /** The "leaf" drop */
    drop: LootDrop | LootDropSubstitute;
    /** For a substitute: the original drop. Otherwise: undefined */
    parentDrop: LootDrop | undefined;
    /** The parent group, only undefined for box-level substitutes which are not subject to dupe rules */
    parentGroup: LootGroup | undefined;
    /** The parent slot, only undefined for box-level substitutes which are not subject to dupe rules */
    parentSlot: LootSlot | undefined;
    /** The parent box */
    parentBox: Lootbox;
    /** The drop's contentType */
    type: LootDropType;
    /** The drop's priority in UI */
    priority: number;
    /** Whether the drop is a substitute */
    isSubstitute: boolean;
    /** Whether the drop is subject to duplication rules */
    isSubjectToDuplicationRules: boolean;
}

/**
 * The interface holding the state of an opening session in the simulator.
 */
export interface OpeningSession {
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
     * Cache associating each LootDrop's name with metadata of the corresponding object in the `referenceLootTable`.
     *
     * The goal here is to allow easy access to each item's loot table "branch" without having to chain
     * `.filter.map.find` all the time. You do that awful traversal once and that's it (unless you also have to find it
     * in the dynamic loot table).
     */
    referenceLootTableUniqueDrops: Record<string, LootTableBranch>;
    /**
     * For each Lootbox's name, how many boxes have been opened during the session.
     */
    lootboxOpenedCounters: Record<string, number>;
    /**
     * For each Lootbox's name, how many boxes have been purchased during the session.
     */
    lootboxPurchasedCounters: Record<string, number>;
    /**
     * For each Lootbox's name, how many boxes are currently available to open.
     */
    lootboxPendingCounters: Record<string, number>;
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
    sessionOpeningNumber: number;
    /** Unique name of the Lootbox that was opened */
    boxName: string;
    /** Box opening counter for this specific Lootbox */
    boxOpeningNumber: number;
    /** Main prize pity counter when the box was opened */
    boxMainPity: number;
    /** Secondary prize pity counter when the box was opened */
    boxSecondaryPity: number;
    /** The list of drops obtained in this box */
    drops: OpeningResultDrop[];
}

/**
 * Simplified form of a LootDrop obtained in an opened box.
 */
export interface OpeningResultDrop {
    /** Amount dropped */
    amount: number;
    /** UI highlight */
    rarityInUi: LootDropType;
    /** The "branch" leading to this drop, excluding substitute-related info */
    lootTableBranch: LootTableBranch;
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
    /**
     * The box opening mode.
     *
     * - 'unlimited': The user can open any box without purchases, one at a time.
     * - 'budget': The user can only open boxes in their inventory. More boxes can be purchased.
     */
    openingMode: 'unlimited' | 'budget' | 'until';
    /**
     * List of prizes which are already owned by the user, to apply duplication rules to the loot table from the start.
     */
    preOwnedPrizes: { name: string; type: LootDropType }[];
    /**
     * List of prizes which the simulator should obtain before stopping in 'unlimited' mode.
     */
    targetPrizes: { name: string; type: LootDropType }[];
    /**
     * How many simulator workers will run in parallel. Not lower than 1.
     */
    simulatorThreads: number;
    /**
     * How many simulations will run in each worker. Not lower than 1.
     */
    simulatorIterationsPerThread: number;
}
