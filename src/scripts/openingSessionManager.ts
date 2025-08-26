import type {
    DuplicateHandlingMode,
    Lootbox,
    LootDrop,
    LootDropSubstitute,
    LootDropType,
    LootGroup,
    LootTable,
} from '../types/lootTable';
import type { OpeningResult, OpeningResultDrop, OpeningSession } from '../types/state';
import type { Maybe } from '../types/utils'; ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// SESSION
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generate a new OpeningSession object for the given LootTable using default values, does NOT setState
 *
 * @param rawTable The raw lootTable JSON string (post validation)
 * @param checksum The checksum of the raw lootTable
 * @returns An new OpeningSession initialized with default parameters.
 */
export const newSession = (rawTable: string, checksum: string): OpeningSession => {
    const refTable = JSON.parse(rawTable) as LootTable;

    // This piece of shit object is worth it, I swear, it's a surprise tool that will help us later
    const allLootDrops: {
        drop: LootDrop | LootDropSubstitute;
        type: LootDropType;
        isSubstitute: boolean;
        duplicateHandlingMode: DuplicateHandlingMode;
    }[] = refTable.lootboxes.flatMap((box) =>
        box.lootSlots.flatMap((slot) =>
            slot.lootGroups.flatMap((groups) =>
                groups.lootDrops.flatMap((lootDrop) => {
                    const duplicateHandlingMode =
                        slot.contentType === 'main'
                            ? box.mainPrizeDuplicates
                            : slot.contentType === 'secondary'
                              ? box.secondaryPrizeDuplicates
                              : 'allowed';
                    const toAdd: {
                        drop: LootDrop | LootDropSubstitute;
                        type: LootDropType;
                        isSubstitute: boolean;
                        duplicateHandlingMode: DuplicateHandlingMode;
                    }[] = [
                        {
                            drop: lootDrop,
                            type: slot.contentType,
                            isSubstitute: false,
                            duplicateHandlingMode: duplicateHandlingMode,
                        },
                    ];
                    if (lootDrop.substitute)
                        toAdd.push({
                            drop: lootDrop.substitute,
                            type: slot.contentType,
                            isSubstitute: true,
                            duplicateHandlingMode: 'allowed',
                        });
                    return toAdd;
                }),
            ),
        ),
    );
    refTable.lootboxes.forEach((box) => {
        if (box.mainPrizeSubstitute) {
            allLootDrops.push({
                drop: box.mainPrizeSubstitute,
                type: 'main',
                isSubstitute: true,
                duplicateHandlingMode: 'allowed',
            });
        }
        if (box.secondaryPrizeSubstitute) {
            allLootDrops.push({
                drop: box.secondaryPrizeSubstitute,
                type: 'secondary',
                isSubstitute: true,
                duplicateHandlingMode: 'allowed',
            });
        }
    });

    return {
        referenceLootTable: refTable,
        dynamicLootTable: JSON.parse(rawTable) as LootTable,
        lootTableUniqueDrops: allLootDrops.reduce(
            (acc, drop) => {
                acc[drop.drop.name] = {
                    name: drop.drop.name,
                    type: drop.type,
                    isSubstitute: drop.isSubstitute,
                    priority: drop.drop.displayPriority ?? 0,
                    isSubjectToDuplicationRules: drop.duplicateHandlingMode !== 'allowed',
                    pictureUrl: drop.drop.pictureUrl,
                };
                return acc;
            },
            {} as Record<
                string,
                {
                    name: string;
                    type: LootDropType;
                    isSubstitute: boolean;
                    priority: number;
                    isSubjectToDuplicationRules: boolean;
                    pictureUrl?: string;
                }
            >,
        ),
        lootboxOpenedCounters: refTable.lootboxes.reduce(
            (acc, box) => {
                acc[box.name] = 0;
                return acc;
            },
            {} as Record<string, number>,
        ),
        lootboxPurchasedCounters: refTable.lootboxes.reduce(
            (acc, box) => {
                acc[box.name] = 0;
                return acc;
            },
            {} as Record<string, number>,
        ),
        lootboxPendingCounters: refTable.lootboxes.reduce(
            (acc, box) => {
                acc[box.name] = 0;
                return acc;
            },
            {} as Record<string, number>,
        ),
        pityCounters: refTable.lootboxes.reduce(
            (acc, box) => {
                acc[box.name] = { mainPity: 1, secondaryPity: 1 };
                return acc;
            },
            {} as Record<string, { mainPity: number; secondaryPity: number }>,
        ),
        aggregatedResults: allLootDrops.reduce(
            (acc, drop) => {
                acc[drop.drop.name] = 0;
                return acc;
            },
            {} as Record<string, number>,
        ),
        history: [],
        simulatorConfig: {
            lootTableChecksum: checksum,
            openingMode: 'unlimited',
            preOwnedPrizes: [],
            targetPrizes: [],
        },
    };
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// MATH
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Picks a random item from the given list using the items' `dropRate` field as weights.
 *
 * https://stackoverflow.com/a/55671924
 *
 * @param items The list of items from which to pick.
 *              The item must contain a `dropRate` field containing a number between 0 (excluded) and 1 (included).
 * @returns The picked item from the list.
 */
const pickWeightedRandom = <T extends { dropRate: number }>(items: T[]): T => {
    const weights: number[] = [items[0].dropRate];
    for (let i = 1; i < items.length; i++) {
        weights[i] = items[i].dropRate + weights[i - 1];
    }
    const random = Math.random();
    for (let i = 0; i < weights.length; i++) {
        if (weights[i] > random) return items[i];
    }
    return items[items.length - 1];
};

/**
 * Distributes the `distributedDropRate` to a given `recipientDropRate` according to the chosen `strategy`.
 */
const distributeDropRate = (
    recipientDropRate: number,
    distributedDropRate: number,
    strategy: 'remove_even' | 'remove_prop',
    recipientCount: number,
): number => {
    return strategy === 'remove_even'
        ? recipientDropRate + distributedDropRate / recipientCount
        : recipientDropRate + (recipientDropRate / (1 - distributedDropRate)) * distributedDropRate;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PITY HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Updates the dropRate of the non-filler slots of a given Lootbox according to its pity status. To be called right
 * before the lootbox gets opened.
 *
 * @param session The opening session.
 * @param refLootbox The reference object of the opened Lootbox.
 * @param lootbox The opened dynamic Lootbox.
 */
const preOpenPityHandling = (session: OpeningSession, refLootbox: Lootbox, lootbox: Lootbox): void => {
    // Main prize slot
    if (session.pityCounters[lootbox.name].mainPity === refLootbox.mainPrizeHardPity) {
        lootbox.lootSlots.find((slot) => slot.contentType === 'main')!.dropRate = 1;
    } else if (
        refLootbox.mainPrizeSoftPity &&
        session.pityCounters[lootbox.name].mainPity >= refLootbox.mainPrizeSoftPity
    ) {
        lootbox.lootSlots.find((slot) => slot.contentType === 'main')!.dropRate +=
            (1 - refLootbox.lootSlots.find((slot) => slot.contentType === 'main')!.dropRate) /
            (refLootbox.mainPrizeHardPity! - refLootbox.mainPrizeSoftPity!);
    }

    // Secondary prize slot
    if (session.pityCounters[lootbox.name].secondaryPity === refLootbox.secondaryPrizeHardPity) {
        lootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.dropRate = 1;
    } else if (
        refLootbox.secondaryPrizeSoftPity &&
        session.pityCounters[lootbox.name].secondaryPity >= refLootbox.secondaryPrizeSoftPity
    ) {
        lootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.dropRate +=
            (1 - refLootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.dropRate) /
            (refLootbox.secondaryPrizeHardPity! - refLootbox.secondaryPrizeSoftPity!);
    }
};

/**
 * Updates pity counters after opening a Lootbox. To be called right after the lootbox was opened.
 *
 * If a pity gets reset, the corresponding slot's dropRate will also be reset.
 *
 * @param session The opening session.
 * @param refLootbox The reference object of the opened Lootbox.
 * @param lootbox The opened dynamic Lootbox.
 * @param result The opening result.
 */
const postOpenPityHandling = (
    session: OpeningSession,
    refLootbox: Lootbox,
    lootbox: Lootbox,
    result: OpeningResult,
): void => {
    // Main prize slot
    session.pityCounters[lootbox.name].mainPity++;
    if (
        (refLootbox.mainPrizeHardPity && session.pityCounters[lootbox.name].mainPity > refLootbox.mainPrizeHardPity) ||
        result.drops.find((drop) => drop.type === 'main')
    ) {
        session.pityCounters[lootbox.name].mainPity = 1;
        lootbox.lootSlots.find((slot) => slot.contentType === 'main')!.dropRate = refLootbox.lootSlots.find(
            (slot) => slot.contentType === 'main',
        )!.dropRate;
    }

    // Secondary prize slot
    session.pityCounters[lootbox.name].secondaryPity++;
    if (
        (refLootbox.secondaryPrizeHardPity &&
            session.pityCounters[lootbox.name].secondaryPity > refLootbox.secondaryPrizeHardPity) ||
        result.drops.find((drop) => drop.type === 'secondary')
    ) {
        session.pityCounters[lootbox.name].secondaryPity = 1;
        lootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.dropRate = refLootbox.lootSlots.find(
            (slot) => slot.contentType === 'secondary',
        )!.dropRate;
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// DUPLICATE HANDLING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Updates the dynamic loot table of the recently opened lootbox to apply the 'replace_individual' duplication rule to
 * the obtained results.
 *
 * @param result The name of the dropped item belonging to this group.
 * @param group The LootGroup to which the rule must be applied.
 * @returns The new rule to save for the dynamic Lootbox ('replace_individual' by default, 'allowed' once all drops are
 *          replaced with their substitute).
 */
const handleReplaceIndividualDuplicateRule = (result: string, group: LootGroup): DuplicateHandlingMode => {
    // Replace matching loot table drop
    const lootDrop = group.lootDrops.find((drop) => drop.name === result)!;
    lootDrop.name = lootDrop.substitute!.name;
    lootDrop.displayPriority = lootDrop.substitute!.displayPriority ?? 0;
    lootDrop.pictureUrl = lootDrop.substitute!.pictureUrl;
    lootDrop.overrideRarityInUi = lootDrop.substitute!.overrideRarityInUi;
    lootDrop.amount = lootDrop.substitute!.amount;

    // Check if all group drops have been handled
    for (const drop of group.lootDrops) {
        if (
            drop.name !== drop.substitute!.name ||
            drop.displayPriority !== lootDrop.substitute!.displayPriority ||
            drop.pictureUrl !== drop.substitute!.pictureUrl ||
            drop.overrideRarityInUi !== drop.substitute!.overrideRarityInUi ||
            drop.amount !== drop.substitute!.amount
        ) {
            // There are still original drops
            return 'replace_individual';
        }
    }
    // All drops have been replaced with a substitute, duplicate handling no longer required
    return 'allowed';
};

/**
 * Updates the dynamic loot table of the recently opened lootbox to apply the 'replace_all' duplication rule to the
 * obtained results.
 *
 * @param result The name of the dropped item belonging to this group.
 * @param group The LootGroup to which the rule must be applied.
 * @param substitute The lootbox-level substitute for this LootGroup.
 * @returns The new rule to save for the dynamic Lootbox ('replace_all' by default, 'allowed' once all drops are
 *          replaced with their substitute).
 */
const handleReplaceAllDuplicationRule = (
    result: string,
    group: LootGroup,
    substitute: LootDropSubstitute,
): DuplicateHandlingMode => {
    // Replace matching loot table drop
    const lootDrop = group.lootDrops.find((drop) => drop.name === result)!;
    lootDrop.name = substitute.name;
    lootDrop.displayPriority = substitute.displayPriority ?? 0;
    lootDrop.pictureUrl = substitute.pictureUrl;
    lootDrop.overrideRarityInUi = substitute.overrideRarityInUi;
    lootDrop.amount = substitute.amount;

    // Check if all group drops have been handled
    for (const drop of group.lootDrops) {
        if (
            drop.name !== substitute.name ||
            drop.displayPriority !== substitute.displayPriority ||
            drop.pictureUrl !== substitute.pictureUrl ||
            drop.overrideRarityInUi !== substitute.overrideRarityInUi ||
            drop.amount !== substitute.amount
        ) {
            // There are still original drops
            return 'replace_all';
        }
    }
    // All drops have been replaced with a substitute, duplicate handling no longer required
    return 'allowed';
};

/**
 * Updates the dynamic loot table of the recently opened lootbox to apply the 'remove_*' duplication rule to the
 * obtained results.
 *
 * @param result The name of the dropped item belonging to this group.
 * @param refGroup The reference object of the LootGroup to which the rule must be applied.
 * @param group The LootGroup to which the rule must be applied.
 * @param globalSubstitute The lootbox-level substitute for this LootGroup. If missing, individual `LootDrop.substitute`
 *                         will be used instead.
 * @param rule Rule used to pick the distribution strategy between even and proportional.
 * @returns The new rule to save for the dynamic Lootbox (`rule` by default, 'allowed' once all drops are removed).
 */
const handleRemoveDuplicateRule = (
    result: string,
    refGroup: LootGroup,
    group: LootGroup,
    globalSubstitute: Maybe<LootDropSubstitute>,
    rule: 'remove_even' | 'remove_prop',
): DuplicateHandlingMode => {
    // Remove matching loot table drop and distribute its dropRate amongst remaining drops.
    const excludedDrop = group.lootDrops.find((drop) => drop.name === result)!;
    const remainingDrops: LootDrop[] = [];
    group.lootDrops.forEach((drop) => {
        if (drop.name !== result) remainingDrops.push(drop);
    });
    remainingDrops.forEach((drop) => {
        drop.dropRate = distributeDropRate(drop.dropRate, excludedDrop.dropRate, rule, remainingDrops.length);
    });

    // Check if all group drops have been handled
    if (remainingDrops.length) {
        // There are still original drops
        group.lootDrops = remainingDrops;
        return rule;
    }
    // All drops have been dropped, reset drops and replace with substitutes, duplicate handling no longer required
    refGroup.lootDrops.forEach((drop) => {
        const substituteDrop: LootDrop = JSON.parse(JSON.stringify(drop));
        substituteDrop.name = globalSubstitute ? globalSubstitute.name : substituteDrop.substitute!.name;
        substituteDrop.displayPriority = globalSubstitute
            ? (globalSubstitute.displayPriority ?? 0)
            : (substituteDrop.substitute!.displayPriority ?? 0);
        substituteDrop.pictureUrl = globalSubstitute
            ? globalSubstitute.pictureUrl
            : substituteDrop.substitute!.pictureUrl;
        substituteDrop.overrideRarityInUi = globalSubstitute
            ? globalSubstitute.overrideRarityInUi
            : substituteDrop.substitute!.overrideRarityInUi;
        substituteDrop.amount = globalSubstitute ? globalSubstitute.amount : substituteDrop.substitute!.amount;
        remainingDrops.push(substituteDrop);
        group.lootDrops = remainingDrops;
    });
    return 'allowed';
};

/**
 * Updates the dynamic loot table of the recently opened lootbox to apply duplication rules to the obtained results.
 *
 * This function must be called **after** the opening. Duplication handling does not alter the result in case it
 * contained a duplicate, but instead alters the loot table to prevent the result's content from being duplicated in
 * future openings. This way, whatever the opened box contains is always known to be valid right away.
 *
 * @param result The name of the dropped item belonging to this group.
 * @param refGroup The reference object of the LootGroup to which the rule must be applied.
 * @param group The LootGroup to which the rule must be applied.
 * @param rule The rule to apply. Must originate from the dynamic lootbox, not reference.
 * @param globalSubstitute The lootbox-level substitute for this LootGroup.
 * @returns The new rule to save for the dynamic Lootbox (equal to `rule` by default, may become 'allowed' once all
 *          drops are obtained and special handling is no longer necessary).
 */
export const handleDuplicationRules = (
    result: string,
    refGroup: LootGroup,
    group: LootGroup,
    rule: DuplicateHandlingMode,
    globalSubstitute: Maybe<LootDropSubstitute>,
): DuplicateHandlingMode => {
    switch (rule) {
        case 'replace_individual':
            return handleReplaceIndividualDuplicateRule(result, group);
        case 'replace_all':
            return handleReplaceAllDuplicationRule(result, group, globalSubstitute!);
        case 'remove_even':
            return handleRemoveDuplicateRule(result, refGroup, group, globalSubstitute, 'remove_even');
        case 'remove_prop':
            return handleRemoveDuplicateRule(result, refGroup, group, globalSubstitute, 'remove_prop');
        case 'allowed':
        default:
            // Nothing to do
            return 'allowed';
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// OPENING
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Opens a single given Lootbox.
 *
 * This function does not mutate the state, and does not do any special handling. It should be wrapped by a manager
 * which handles dynamic editing of the LootTable (drop rates, duplicates handling, pity...) and session management.
 *
 * @param lootbox The Lootbox to open.
 * @returns The list of OpeningResultDrop obtained in the box.
 */
const openOne = (lootbox: Lootbox): OpeningResultDrop[] => {
    if (!lootbox) return [];
    const results: OpeningResultDrop[] = [];
    lootbox.lootSlots.forEach((slot) => {
        if (slot.dropRate <= Math.random()) return;
        const pickedGroup = pickWeightedRandom(slot.lootGroups);
        const pickedDrop = pickWeightedRandom(pickedGroup.lootDrops);
        results.push({
            type: slot.contentType,
            name: pickedDrop.name,
            amount: pickedDrop.amount,
            rarityInUi: pickedDrop.overrideRarityInUi || slot.contentType,
        });
    });
    return results;
};

/**
 * Opens a single selected Lootbox and updates the session after handling
 *
 * TODO: handle `autoOpenRecursive`: exclude recursive boxes from the results and replace them with their own content
 *  immediately. Since it will involve its own set of state changes, should be a recursive call to this same function
 *  and should probably take place at the end.
 *
 * @param session The current opening session state. This object **WILL** be modified without cloning, and returned.
 *                The session is assumed to be in a valid state, there will be NO error handling for potentially missing
 *                or invalid expected values.
 * @param lootboxName The `name` of the lootbox to open.
 * @returns The updated session state.
 */
export const openOneAndUpdateState = (session: OpeningSession, lootboxName: string): OpeningSession => {
    const refLootbox: Lootbox = session.referenceLootTable.lootboxes.find((box: Lootbox) => box.name === lootboxName)!;
    const lootbox: Lootbox = session.dynamicLootTable.lootboxes.find((box: Lootbox) => box.name === lootboxName)!;

    // Update drop rates depending on pity
    preOpenPityHandling(session, refLootbox, lootbox);

    // Open and push to history
    const resultDrops = openOne(lootbox);
    const result: OpeningResult = {
        sessionOpeningNumber: session.history.length + 1,
        boxName: session?.dynamicLootTable?.lootboxes[0].name,
        boxOpeningNumber: session.lootboxOpenedCounters[lootbox.name] + 1,
        boxMainPity: session.pityCounters[lootbox.name].mainPity,
        boxSecondaryPity: session.pityCounters[lootbox.name].secondaryPity,
        drops: resultDrops,
    };
    session.history.push(result);

    // Update pity and reset drop rates if needed
    postOpenPityHandling(session, refLootbox, lootbox, result);

    // Update counters
    session.lootboxOpenedCounters[lootbox.name]++;
    session.lootboxPendingCounters[lootbox.name]--;
    resultDrops.forEach((result) => {
        session.aggregatedResults[result.name] += result.amount;
        if (Object.keys(session.lootboxPendingCounters).includes(result.name)) {
            session.lootboxPendingCounters[result.name]++;
        }
    });

    // Handle duplication rules
    const mainPrizeResult = result.drops.find((resultDrop) => resultDrop.type === 'main')?.name;
    if (mainPrizeResult) {
        lootbox.mainPrizeDuplicates = handleDuplicationRules(
            mainPrizeResult,
            refLootbox.lootSlots.find((slot) => slot.contentType === 'main')!.lootGroups[0],
            lootbox.lootSlots.find((slot) => slot.contentType === 'main')!.lootGroups[0],
            lootbox.mainPrizeDuplicates,
            lootbox.mainPrizeSubstitute,
        );
    }
    const secondaryPrizeResult = result.drops.find((resultDrop) => resultDrop.type === 'secondary')?.name;
    if (secondaryPrizeResult) {
        lootbox.secondaryPrizeDuplicates = handleDuplicationRules(
            secondaryPrizeResult,
            refLootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.lootGroups[0],
            lootbox.lootSlots.find((slot) => slot.contentType === 'secondary')!.lootGroups[0],
            lootbox.secondaryPrizeDuplicates,
            lootbox.secondaryPrizeSubstitute,
        );
    }

    return session;
};

/**
 * Opens every lootbox available in the inventory, including the ones that may be obtained during this process.
 *
 * @param initialSession The initial state of the session, before the opening starts. This object **WILL** be modified
 *                       without cloning, and returned.
 *                       The session is assumed to be in a valid state, there will be NO error handling for potentially
 *                       missing or invalid expected values.
 * @returns The final state of the session, after the opening ends.
 */
export const openAllInInventory = (initialSession: OpeningSession): OpeningSession => {
    let session = initialSession;
    let nextLootbox: string | null = findNextLootboxInInventory(session);
    while ((nextLootbox = findNextLootboxInInventory(session, nextLootbox ?? undefined))) {
        while (session.lootboxPendingCounters[nextLootbox] > 0) {
            session = openOneAndUpdateState(session, nextLootbox);
        }
    }
    return session;
};

/**
 * Finds the next lootbox in the session with inventory left.
 *
 * @param session The current opening session state. This object will not be modified.
 * @param lootboxName The `name` of the currently selected lootbox to use as the starting point for the search.
 * @returns The `name` of the next lootbox with some inventory left, or null if the inventory is empty.
 */
export const findNextLootboxInInventory = (session: OpeningSession, lootboxName?: string): string | null => {
    const availableLootboxes = Object.keys(session.lootboxPendingCounters);
    let lootboxIndex =
        lootboxName && availableLootboxes.includes(lootboxName)
            ? availableLootboxes.findIndex((availableName) => availableName === lootboxName)
            : 0;
    while (lootboxIndex < availableLootboxes.length) {
        if (session.lootboxPendingCounters[availableLootboxes[lootboxIndex]] > 0) {
            return availableLootboxes[lootboxIndex];
        }
        lootboxIndex++;
    }
    return null;
};
