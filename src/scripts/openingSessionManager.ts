import type {
    DuplicateHandlingMode,
    Lootbox,
    LootDrop,
    LootDropSubstitute,
    LootGroup,
    LootSlot,
    LootTable,
} from '../types/lootTable';
import type { LootTableBranch, OpeningResult, OpeningResultDrop, OpeningSession } from '../types/state';
import type { Maybe } from '../types/utils';

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
    const allLootDrops: LootTableBranch[] = refTable.lootboxes.flatMap((box) =>
        box.lootSlots.flatMap((slot) =>
            slot.lootGroups.flatMap((group) =>
                group.lootDrops.flatMap((drop) => {
                    const contentType = slot.contentType ?? group.contentType!;
                    const duplicateHandlingMode =
                        contentType === 'main'
                            ? box.mainPrizeDuplicates
                            : contentType === 'secondary'
                              ? box.secondaryPrizeDuplicates
                              : 'allowed';
                    const toAdd: LootTableBranch[] = [
                        {
                            drop: drop,
                            parentDrop: undefined,
                            parentGroup: group,
                            parentSlot: slot,
                            parentBox: box,
                            type: contentType,
                            priority: drop.displayPriority ?? 0,
                            isSubstitute: false,
                            isSubjectToDuplicationRules: duplicateHandlingMode !== 'allowed',
                        },
                    ];
                    if (drop.substitute)
                        toAdd.push({
                            drop: drop.substitute,
                            parentDrop: drop,
                            parentGroup: group,
                            parentSlot: slot,
                            parentBox: box,
                            type: contentType,
                            priority: drop.substitute.displayPriority ?? 0,
                            isSubstitute: true,
                            isSubjectToDuplicationRules: false,
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
                parentDrop: undefined,
                parentGroup: undefined,
                parentSlot: undefined,
                parentBox: box,
                type: 'main',
                priority: box.mainPrizeSubstitute.displayPriority ?? 0,
                isSubstitute: true,
                isSubjectToDuplicationRules: false,
            });
        }
        if (box.secondaryPrizeSubstitute) {
            allLootDrops.push({
                drop: box.secondaryPrizeSubstitute,
                parentDrop: undefined,
                parentGroup: undefined,
                parentSlot: undefined,
                parentBox: box,
                type: 'secondary',
                priority: box.secondaryPrizeSubstitute.displayPriority ?? 0,
                isSubstitute: true,
                isSubjectToDuplicationRules: false,
            });
        }
    });

    return {
        referenceLootTable: refTable,
        dynamicLootTable: JSON.parse(rawTable) as LootTable,
        // The reduce does mean that the last occurrence of a value will override previous ones but at this point I
        // assume the loot table is smart enough to not apply 10 different rules to 10 different occurrences of the same
        // drop. If that doesn't work, give each variant a unique name. The only thing that should change between
        // two LootDrop of the same name is the drop-specific `amount` / `dropRate` / `overrideRarityInUi`, NOT metadata
        referenceLootTableUniqueDrops: allLootDrops.reduce(
            (acc, drop) => {
                // Don't override metadata of base drop with substitute to avoid losing branch info.
                // We only want to save substitutes if their content is exclusive to substitutes.
                if (Object.keys(acc).includes(drop.drop.name) && drop.isSubstitute) return acc;
                acc[drop.drop.name] = drop;
                return acc;
            },
            {} as Record<string, LootTableBranch>,
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
            targetGold: 0,
            simulatorThreads: 1,
            simulatorIterationsPerThread: 1,
        },
    };
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

    // In case of re-entry, restart the loop if current box is done to check for re-drops of previous boxes
    if (lootboxIndex > 0 && session.lootboxPendingCounters[availableLootboxes[lootboxIndex]] === 0) {
        lootboxIndex = 0;
    }

    while (lootboxIndex < availableLootboxes.length) {
        if (session.lootboxPendingCounters[availableLootboxes[lootboxIndex]] > 0) {
            return availableLootboxes[lootboxIndex];
        }
        lootboxIndex++;
    }
    return null;
};

/**
 * Finds the LootSlot and (if applicable) LootGroup containing the requested non-filler type in a given Lootbox.
 * @param lootbox The Lootbox to explore.
 * @param type The non-filler LootDropType to find.
 * @returns the found slot/group, or undefined if none is found (in the case of secondary groups usually)
 */
export const findSpecialSlotAndGroup = (
    lootbox: Lootbox,
    type: 'main' | 'secondary',
): { slot: LootSlot; group: LootGroup | undefined } | undefined => {
    return lootbox.lootSlots
        .map((slot) => {
            if (slot.contentType === type) return { slot, group: undefined };
            if (!slot.contentType) {
                const group =
                    slot.lootGroups
                        .map((group) => (group.contentType === type ? group : undefined))
                        .filter((group) => !!group)
                        .pop() ?? undefined;
                if (group) return { slot, group };
            }
            return { slot: undefined, group: undefined };
        })
        .filter((object) => !!object.slot)
        .pop();
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
 * Distributes the `distributedDropRate` to a given `recipientDropRate` proportionally.
 */
const distributeDropRate = (recipientDropRate: number, distributedDropRate: number): number => {
    return recipientDropRate + (recipientDropRate / (1 - distributedDropRate)) * distributedDropRate;
};

/**
 * "Steals" the `targetDropRate` from a given `sourceDropRate` proportionally, to give it to a `recipientDropRate`.
 */
const stealDropRate = (sourceDropRate: number, targetDropRate: number, recipientDropRate: number): number => {
    return sourceDropRate - (sourceDropRate / (1 - recipientDropRate)) * targetDropRate;
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// PITY HANDLING
// This is hell but only because I support a bunch of options. It would be cleaner if gambling was simpler.
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Updates the dropRate of the non-filler slots/group of a given Lootbox according to its pity status. To be called
 * right before the lootbox gets opened.
 *
 * @param session The opening session.
 * @param refLootbox The reference object of the opened Lootbox.
 * @param lootbox The opened dynamic Lootbox.
 */
const preOpenPityHandling = (session: OpeningSession, refLootbox: Lootbox, lootbox: Lootbox): void => {
    // Main prize slot/group
    const mainSlotAndGroup = findSpecialSlotAndGroup(lootbox, 'main')!;
    const refMainSlotAndGroup = findSpecialSlotAndGroup(refLootbox, 'main')!;

    // Update main dropRate if needed
    if (refLootbox.mainPrizeHardPity && session.pityCounters[lootbox.name].mainPity >= refLootbox.mainPrizeHardPity) {
        // Hard Pity
        if (mainSlotAndGroup.group) {
            mainSlotAndGroup.slot.lootGroups.forEach(
                (group) => (group.dropRate = group.contentType === 'main' ? 1 : 0),
            );
        } else {
            mainSlotAndGroup.slot.dropRate = 1;
        }
    } else if (
        refLootbox.mainPrizeSoftPity &&
        session.pityCounters[lootbox.name].mainPity >= refLootbox.mainPrizeSoftPity
    ) {
        // Soft Pity
        if (mainSlotAndGroup.group) {
            const dropRateDiff =
                (1 - refMainSlotAndGroup.group!.dropRate) /
                (refLootbox.mainPrizeHardPity! - refLootbox.mainPrizeSoftPity!);
            const recipientDropRateMain = mainSlotAndGroup.group.dropRate;
            mainSlotAndGroup.slot.lootGroups.forEach(
                (group) =>
                    (group.dropRate =
                        group.contentType === 'main'
                            ? group.dropRate + dropRateDiff
                            : stealDropRate(group.dropRate, dropRateDiff, recipientDropRateMain)),
            );
        } else {
            mainSlotAndGroup.slot.dropRate +=
                (1 - refMainSlotAndGroup.slot.dropRate) /
                (refLootbox.mainPrizeHardPity! - refLootbox.mainPrizeSoftPity!);
        }
    }

    // Secondary prize slot/group
    const secondarySlotAndGroup = findSpecialSlotAndGroup(lootbox, 'secondary');
    const refSecondarySlotAndGroup = findSpecialSlotAndGroup(refLootbox, 'secondary');
    if (!secondarySlotAndGroup || !refSecondarySlotAndGroup) return;

    // Update secondary dropRate if needed
    if (
        refLootbox.secondaryPrizeHardPity &&
        session.pityCounters[lootbox.name].secondaryPity >= refLootbox.secondaryPrizeHardPity
    ) {
        // Hard Pity
        // "Skip" secondary hard pity if it's a group in the same slot as the main prize, and main hard pity is reached
        if (
            JSON.stringify(secondarySlotAndGroup.slot) !== JSON.stringify(mainSlotAndGroup.slot) ||
            session.pityCounters[lootbox.name].mainPity === refLootbox.mainPrizeHardPity
        ) {
            if (secondarySlotAndGroup.group) {
                secondarySlotAndGroup.slot.lootGroups.forEach(
                    (group) => (group.dropRate = group.contentType === 'secondary' ? 1 : 0),
                );
            } else {
                secondarySlotAndGroup.slot.dropRate = 1;
            }
        }
    } else if (
        refLootbox.secondaryPrizeSoftPity &&
        session.pityCounters[lootbox.name].secondaryPity >= refLootbox.secondaryPrizeSoftPity
    ) {
        // Soft Pity
        // We don't run the risk of overlapping with main-prize soft pity because this scenario is forbidden in the
        // LootTable validator.
        if (secondarySlotAndGroup.group) {
            const dropRateDiff =
                (1 - refSecondarySlotAndGroup.group!.dropRate) /
                (refLootbox.secondaryPrizeHardPity! - refLootbox.secondaryPrizeSoftPity!);
            const recipientDropRateSecondary = secondarySlotAndGroup.group.dropRate;
            secondarySlotAndGroup.slot.lootGroups.forEach(
                (group) =>
                    (group.dropRate =
                        group.contentType === 'secondary'
                            ? group.dropRate + dropRateDiff
                            : stealDropRate(group.dropRate, dropRateDiff, recipientDropRateSecondary)),
            );
        } else {
            secondarySlotAndGroup.slot.dropRate +=
                (1 - refSecondarySlotAndGroup.slot.dropRate) /
                (refLootbox.secondaryPrizeHardPity! - refLootbox.secondaryPrizeSoftPity!);
        }
    }
};

/**
 * Updates pity counters after opening a Lootbox. To be called right after the lootbox was opened.
 *
 * If a pity gets reset, the corresponding slot/group's dropRate will also be reset.
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
    if (result.drops.find((drop) => drop.lootTableBranch.type === 'main')) {
        session.pityCounters[lootbox.name].mainPity = 1;
        // Reset altered dropRates
        const mainSlotAndGroup = findSpecialSlotAndGroup(lootbox, 'main')!;
        const refMainSlotAndGroup = findSpecialSlotAndGroup(refLootbox, 'main')!;
        if (mainSlotAndGroup.group) {
            for (let i = 0; i < mainSlotAndGroup.slot.lootGroups.length; i++) {
                mainSlotAndGroup.slot.lootGroups[i].dropRate = refMainSlotAndGroup.slot.lootGroups[i].dropRate;
            }
        } else {
            mainSlotAndGroup.slot.dropRate = refMainSlotAndGroup.slot.dropRate;
        }
    }

    // Secondary prize slot
    session.pityCounters[lootbox.name].secondaryPity++;
    if (result.drops.find((drop) => drop.lootTableBranch.type === 'secondary')) {
        session.pityCounters[lootbox.name].secondaryPity = 1;
        // Reset altered dropRates
        const secondarySlotAndGroup = findSpecialSlotAndGroup(lootbox, 'secondary')!;
        const refSecondarySlotAndGroup = findSpecialSlotAndGroup(refLootbox, 'secondary')!;
        if (secondarySlotAndGroup.group) {
            for (let i = 0; i < secondarySlotAndGroup.slot.lootGroups.length; i++) {
                secondarySlotAndGroup.slot.lootGroups[i].dropRate =
                    refSecondarySlotAndGroup.slot.lootGroups[i].dropRate;
            }
        } else {
            secondarySlotAndGroup.slot.dropRate = refSecondarySlotAndGroup.slot.dropRate;
        }
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
 * @returns The new rule to save for the dynamic Lootbox ('remove' by default, 'allowed' once all drops are removed).
 */
const handleRemoveDuplicateRule = (
    result: string,
    refGroup: LootGroup,
    group: LootGroup,
    globalSubstitute: Maybe<LootDropSubstitute>,
): DuplicateHandlingMode => {
    // Remove matching loot table drop and distribute its dropRate amongst remaining drops.
    const excludedDrop = group.lootDrops.find((drop) => drop.name === result)!;
    const remainingDrops: LootDrop[] = [];
    group.lootDrops.forEach((drop) => {
        if (drop.name !== result) remainingDrops.push(drop);
    });
    remainingDrops.forEach((drop) => {
        drop.dropRate = distributeDropRate(drop.dropRate, excludedDrop.dropRate);
    });

    // Check if all group drops have been handled
    if (remainingDrops.length) {
        // There are still original drops
        group.lootDrops = remainingDrops;
        return 'remove';
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
        case 'remove':
            return handleRemoveDuplicateRule(result, refGroup, group, globalSubstitute);
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
        const duplicateHandlingMode =
            slot.contentType === 'main'
                ? lootbox.mainPrizeDuplicates
                : slot.contentType === 'secondary'
                  ? lootbox.secondaryPrizeDuplicates
                  : 'allowed';
        results.push({
            amount: pickedDrop.amount,
            rarityInUi: pickedDrop.overrideRarityInUi || (slot.contentType ?? pickedGroup.contentType!),
            lootTableBranch: {
                drop: pickedDrop,
                parentGroup: pickedGroup,
                parentSlot: slot,
                parentBox: lootbox,
                type: slot.contentType ?? pickedGroup.contentType!,
                priority: pickedDrop.displayPriority ?? 0,
                isSubjectToDuplicationRules: duplicateHandlingMode !== 'allowed',
                // Can't know substitute details here, but should also not matter for the upcoming handling.
                parentDrop: undefined,
                isSubstitute: false,
            },
        });
    });
    return results;
};

/**
 * Opens a single selected Lootbox and updates the session after handling
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
        boxName: lootbox.name,
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
        session.aggregatedResults[result.lootTableBranch.drop.name] += result.amount;
        if (Object.keys(session.lootboxPendingCounters).includes(result.lootTableBranch.drop.name)) {
            session.lootboxPendingCounters[result.lootTableBranch.drop.name]++;
        }
    });

    // Handle duplication rules
    const mainPrizeResult = result.drops.find((resultDrop) => resultDrop.lootTableBranch.type === 'main');
    if (mainPrizeResult) {
        lootbox.mainPrizeDuplicates = handleDuplicationRules(
            mainPrizeResult.lootTableBranch.drop.name,
            session.referenceLootTableUniqueDrops[mainPrizeResult.lootTableBranch.drop.name].parentGroup!,
            mainPrizeResult.lootTableBranch.parentGroup!,
            lootbox.mainPrizeDuplicates,
            lootbox.mainPrizeSubstitute,
        );
    }
    const secondaryPrizeResult = result.drops.find((resultDrop) => resultDrop.lootTableBranch.type === 'secondary');
    if (secondaryPrizeResult) {
        lootbox.secondaryPrizeDuplicates = handleDuplicationRules(
            secondaryPrizeResult.lootTableBranch.drop.name,
            session.referenceLootTableUniqueDrops[secondaryPrizeResult.lootTableBranch.drop.name].parentGroup!,
            secondaryPrizeResult.lootTableBranch.parentGroup!,
            lootbox.secondaryPrizeDuplicates,
            lootbox.secondaryPrizeSubstitute,
        );
    }

    // Handle recursive boxes
    if (session.referenceLootTable.autoOpenRecursive) {
        for (const drop of resultDrops) {
            if (Object.keys(session.lootboxOpenedCounters).includes(drop.lootTableBranch.drop.name)) {
                // Undo history push and remove the box from the results
                session.history.pop();
                result.drops = result.drops.filter((resultDrop) => JSON.stringify(resultDrop) !== JSON.stringify(drop));
                // Recursively open that box
                session = openOneAndUpdateState(session, drop.lootTableBranch.drop.name);
                // Merge the results with the recursion ones
                const recursiveResult = session.history.pop();
                recursiveResult!.drops.forEach((resultDrop) => {
                    result.drops.push(resultDrop);
                });
                // Re-push the updated results to history
                session.history.push(result);
            }
        }
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
 * Purchases and opens lootboxes until a given goal is reached.
 *
 * @param session The initial state of the session, where goals are properly set in the configuration. This object
 *                **WILL** be modified without cloning, and returned.
 * @returns The final state of the session after the goal has been reached.
 */
export const openUntilOneIteration = (session: OpeningSession): OpeningSession => {
    if (!session.simulatorConfig.targetPrizes.length && !session.simulatorConfig.targetGold) return session;

    const preOwned = session.simulatorConfig.preOwnedPrizes.map((item) => item.name);
    const goals = session.simulatorConfig.targetPrizes
        .map((item) => item.name)
        .filter((item) => !preOwned.includes(item));
    const purchasableBox: string = session.referenceLootTable.lootboxes.find((box: Lootbox) => box.purchasable)!.name;

    // Pre-init in case simulate was pressed again after already fulfilling the goal
    let allPrizesObtained =
        session.simulatorConfig.targetPrizes.length > 0
            ? Object.entries(session.aggregatedResults).filter(([key, value]) => goals.includes(key) && value > 0)
                  .length === goals.length
            : true;

    let allGoldObtained = session.aggregatedResults['gold'] >= (session.simulatorConfig.targetGold ?? 0);

    while (!allPrizesObtained || !allGoldObtained) {
        // Buy a box
        session.lootboxPurchasedCounters[purchasableBox]++;
        session.lootboxPendingCounters[purchasableBox]++;
        // Open all
        session = openAllInInventory(session);
        // Check results
        allPrizesObtained =
            session.simulatorConfig.targetPrizes.length > 0
                ? Object.entries(session.aggregatedResults).filter(([key, value]) => goals.includes(key) && value > 0)
                      .length === goals.length
                : true;
        allGoldObtained = session.aggregatedResults['gold'] >= (session.simulatorConfig.targetGold ?? 0);
    }

    return session;
};

/**
 * Purchases and opens lootboxes until a given goal is reached. Repeats the experiment multiple time to obtain statistics.
 *
 * @param rawInitialSession The initial state of the session, in JSON string form, where goals are properly set in the
 *                          configuration.
 * @param iterations The number of simulations to run
 * @returns The number of boxes purchased before the goal was reached, for each iteration
 */
export const openUntilMultipleIterations = (rawInitialSession: string, iterations: number): number[] => {
    const iterationPurchases: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const iterationResult = openUntilOneIteration(JSON.parse(rawInitialSession) as OpeningSession);
        iterationPurchases.push(Object.values(iterationResult.lootboxPurchasedCounters).find((val) => val > 0) || 0);
    }

    return iterationPurchases;
};
