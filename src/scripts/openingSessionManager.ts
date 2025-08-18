import type { Lootbox } from '../types/lootTable';
import type { OpeningResultDrop } from '../types/state';

/**
 * Picks a random item from the given list using the items' `dropRate` field as weights.
 *
 * https://stackoverflow.com/a/55671924
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
export const openOne = (lootbox: Lootbox): OpeningResultDrop[] => {
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
