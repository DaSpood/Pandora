import type { Lootbox, LootDrop, LootDropSubstitute, LootTable } from '../types/lootTable';
import type { OpeningResult, OpeningResultDrop, OpeningSession } from '../types/state';

/**
 * Generate a new OpeningSession object for the given LootTable using default values, does NOT setState
 *
 * @param rawTable The raw lootTable JSON string (post validation)
 * @param checksum The checksum of the raw lootTable
 * @returns An new OpeningSession initialized with default parameters.
 */
export const newSession = (rawTable: string, checksum: string): OpeningSession => {
    const refTable = JSON.parse(rawTable) as LootTable;

    const allLootDrops: (LootDrop | LootDropSubstitute)[] = refTable.lootboxes.flatMap((box) =>
        box.lootSlots.flatMap((slot) =>
            slot.lootGroups.flatMap((groups) =>
                groups.lootDrops.flatMap((drop) => (drop.substitute ? [drop, drop.substitute] : [drop])),
            ),
        ),
    );
    refTable.lootboxes.forEach((box) => {
        if (box.mainPrizeSubstitute) {
            allLootDrops.push(box.mainPrizeSubstitute);
        }
        if (box.secondaryPrizeSubstitute) {
            allLootDrops.push(box.secondaryPrizeSubstitute);
        }
    });

    const newSession: OpeningSession = {
        referenceLootTable: refTable,
        dynamicLootTable: JSON.parse(rawTable) as LootTable,
        lootTableUniqueDrops: allLootDrops.reduce(
            (acc, drop) => {
                acc[drop.name] = {
                    name: drop.name,
                    pictureUrl: drop.pictureUrl,
                    backgroundUrl: drop.backgroundUrl,
                };
                return acc;
            },
            {} as Record<string, { name: string; pictureUrl?: string; backgroundUrl?: string }>,
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
                acc[drop.name] = 0;
                return acc;
            },
            {} as Record<string, number>,
        ),
        history: [],
        simulatorConfig: {
            lootTableChecksum: checksum,
        },
    };
    return newSession;
};

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
        });
    });
    return results;
};

/**
 * Updates the dropRate of the non-filler slots of a given Lootbox according to its pity status. To be called right
 * before the lootbox gets opened.
 *
 * @param session The opening session
 * @param refLootbox The reference object of the opened Lootbox
 * @param lootbox The opened dynamic Lootbox
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
 * @param session The opening session
 * @param refLootbox The reference object of the opened Lootbox
 * @param lootbox The opened dynamic Lootbox
 * @param result The opening result
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

/**
 * Updates the dynamic loot table of the recently opened lootbox to apply duplication rules to the obtained results.
 *
 * This function must be called **after** the opening. Duplication handling does not alter the result in case it
 * contained a duplicate, but instead alters the loot table to prevent the result's content from being duplicated in
 * future openings. This way, whatever the opened box contains is always known to be valid right away.
 *
 * @param session The opening session
 * @param refLootbox The reference object of the opened Lootbox
 * @param lootbox The opened dynamic Lootbox
 * @param result The opening result
 */
const handleDuplicationRules = (
    session: OpeningSession,
    refLootbox: Lootbox,
    lootbox: Lootbox,
    result: OpeningResult,
): void => {
    // Main prize slot
    // TODO
    // Secondary prize slot
    // TODO
};

/**
 * Opens a single selected Lootbox and updates the session after handling
 *
 * @param session The current opening session state. This object will be modified without cloning and returned.
 *                The session is assumed to be in a valid state. Will not handle cases where expected value is missing.
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
    handleDuplicationRules(session, refLootbox, lootbox, result);

    return session;
};
