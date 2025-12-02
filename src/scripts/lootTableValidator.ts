import type { Lootbox, LootDrop, LootDropSubstitute, LootGroup, LootSlot, LootTable } from '../types/lootTable';
import type { Maybe } from '../types/utils';

// Primitives

export const validateRequiredString = (obj: unknown): boolean => {
    return typeof obj === 'string' && obj.trim().length > 0;
};

export const validateRequiredArray = (obj: unknown): boolean => {
    return Array.isArray(obj) && obj.length > 0;
};

export const validateRequiredBoolean = (obj: unknown): boolean => {
    return typeof obj === 'boolean';
};

export const validateRequiredDate = (obj: unknown): boolean => {
    return typeof obj === 'string' && !!Date.parse(obj);
};

export const validateRequiredEnum = (obj: unknown, options: unknown[]): boolean => {
    return !!obj && options.includes(obj);
};

export const validateRequiredDropRate = (obj: unknown): boolean => {
    return typeof obj === 'number' && obj > 0.0 && obj <= 1.0;
};

export const validateRequiredStrictlyPositiveInt = (obj: unknown): boolean => {
    return typeof obj === 'number' && Number.isInteger(obj) && obj > 0;
};

export const validateOptionalString = (obj: unknown): boolean => {
    return !obj || (typeof obj === 'string' && obj.trim().length > 0);
};

export const validateOptionalEnum = (obj: unknown, options: unknown[]): boolean => {
    return !obj || options.includes(obj);
};

export const validateOptionalUrl = (obj: unknown): boolean => {
    return (
        !obj ||
        (typeof obj === 'string' &&
            (obj.startsWith('images/') ||
                /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(
                    obj,
                )))
    );
};

export const validateOptionalStrictlyPositiveInt = (obj: unknown): boolean => {
    return !obj || (typeof obj === 'number' && Number.isInteger(obj) && obj > 0);
};

export const validateOptionalPositiveInt = (obj: unknown): boolean => {
    return !obj || (typeof obj === 'number' && Number.isInteger(obj) && obj >= 0);
};

// Loot table structure

export const validateLootDropSubstitute = (substitute: Maybe<LootDropSubstitute>, fieldName?: string): string[] => {
    const prefix = fieldName || 'substitute';
    if (!substitute) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(substitute.name)) {
        errors.push(`${prefix}.name is invalid`);
    }
    if (!validateOptionalStrictlyPositiveInt(substitute.displayPriority)) {
        errors.push(`${prefix}.displayPriority is invalid`);
    }
    if (!validateOptionalUrl(substitute.pictureUrl)) {
        errors.push(`${prefix}.pictureUrl is invalid`);
    }
    if (!validateOptionalEnum(substitute.overrideRarityInUi, ['main', 'secondary', 'filler'])) {
        errors.push(`${prefix}.overrideRarityInUi is invalid`);
    }
    if (!validateRequiredStrictlyPositiveInt(substitute.amount)) {
        errors.push(`${prefix}.amount is invalid`);
    }

    return errors;
};

export const validateLootDrop = (drop: Maybe<LootDrop>, selfIndex: number, expectSubstitute: boolean): string[] => {
    const prefix = `lootDrops[${selfIndex}]`;
    if (!drop) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(drop.name)) {
        errors.push(`${prefix}.name is invalid`);
    }
    if (!validateOptionalStrictlyPositiveInt(drop.displayPriority)) {
        errors.push(`${prefix}.displayPriority is invalid`);
    }
    if (!validateOptionalUrl(drop.pictureUrl)) {
        errors.push(`${prefix}.pictureUrl is invalid`);
    }
    if (!validateOptionalEnum(drop.overrideRarityInUi, ['main', 'secondary', 'filler'])) {
        errors.push(`${prefix}.overrideRarityInUi is invalid`);
    }
    if (!validateRequiredDropRate(drop.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (!validateRequiredStrictlyPositiveInt(drop.amount)) {
        errors.push(`${prefix}.amount is invalid`);
    }
    if (expectSubstitute) {
        errors.push(...validateLootDropSubstitute(drop.substitute).map((error) => `${prefix}.${error}`));
    } else if (drop.substitute) {
        errors.push(`${prefix}.substitute should not be present`);
    }

    return errors;
};

export const validateLootGroup = (
    group: LootGroup,
    selfIndex: number,
    expectSubstitute: boolean,
    expectContentType: boolean,
): string[] => {
    const prefix = `lootGroups[${selfIndex}]`;
    if (!group) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(group.alias)) {
        errors.push(`${prefix}.alias is invalid`);
    }
    if (!validateRequiredDropRate(group.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (expectContentType && !validateRequiredEnum(group.contentType, ['main', 'secondary', 'filler'])) {
        errors.push(`${prefix}.contentType is invalid`);
    }
    if (!validateRequiredArray(group.lootDrops)) {
        errors.push(`${prefix}.lootDrops is invalid`);
    }

    const actualExpectSubstitute = expectContentType
        ? expectSubstitute && (group.contentType === 'main' || group.contentType === 'secondary')
        : expectSubstitute;

    let dropRatesTotal = 0;
    group.lootDrops?.forEach((drop, index) => {
        errors.push(...validateLootDrop(drop, index, actualExpectSubstitute).map((error) => `${prefix}.${error}`));
        dropRatesTotal += drop.dropRate ?? 0;
    });
    if (Number(dropRatesTotal.toFixed(6)) !== 1) {
        errors.push(`${prefix}.lootDrops has an invalid total dropRate of ${dropRatesTotal}`);
    }

    return errors;
};

export const validateLootSlot = (
    slot: LootSlot,
    selfIndex: number,
    expectMainSubstitute: boolean,
    expectSecSubstitute: boolean,
    expectSlotLevelContentType: boolean,
): string[] => {
    const prefix = `lootSlots[${selfIndex}]`;
    if (!slot) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(slot.alias)) {
        errors.push(`${prefix}.alias is invalid`);
    }
    if (!validateRequiredDropRate(slot.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (
        expectSlotLevelContentType
            ? !validateRequiredEnum(slot.contentType, ['main', 'secondary', 'filler'])
            : !validateOptionalEnum(slot.contentType, ['main', 'secondary', 'filler'])
    ) {
        errors.push(`${prefix}.contentType is invalid`);
    }
    if (!validateRequiredArray(slot.lootGroups)) {
        errors.push(`${prefix}.lootGroups is invalid`);
    }

    let dropRatesTotal = 0;
    const expectContentType = !expectSlotLevelContentType && !slot.contentType;
    const expectSubstitute =
        (expectMainSubstitute && (expectContentType || slot.contentType === 'main')) ||
        (expectSecSubstitute && (expectContentType || slot.contentType === 'secondary'));
    slot.lootGroups?.forEach((group, index) => {
        errors.push(
            ...validateLootGroup(group, index, expectSubstitute, expectContentType).map(
                (error) => `${prefix}.${error}`,
            ),
        );
        dropRatesTotal += group.dropRate ?? 0;
    });
    if (Number(dropRatesTotal.toFixed(6)) !== 1) {
        errors.push(`${prefix}.lootGroups has an invalid total dropRate of ${dropRatesTotal}`);
    }

    if (!expectContentType && ['main', 'secondary'].includes(slot.contentType!) && slot.lootGroups?.length > 1) {
        errors.push(`${prefix}.lootGroups should only contain 1 element for a '${slot.contentType}' slot`);
    }

    return errors;
};

export const validateLootbox = (box: Lootbox, selfIndex: number): string[] => {
    const prefix = `lootboxes[${selfIndex}]`;
    if (!box) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(box.name)) {
        errors.push(`${prefix}.name is invalid`);
    }
    if (!validateOptionalUrl(box.pictureUrl)) {
        errors.push(`${prefix}.pictureUrl is invalid`);
    }
    if (!validateRequiredBoolean(box.purchasable)) {
        errors.push(`${prefix}.purchasable is invalid`);
    }
    if (!validateOptionalStrictlyPositiveInt(box.mainPrizeHardPity)) {
        errors.push(`${prefix}.mainPrizeHardPity is invalid`);
    }
    if (!validateOptionalStrictlyPositiveInt(box.mainPrizeSoftPity)) {
        errors.push(`${prefix}.mainPrizeSoftPity is invalid`);
    }
    if (box.mainPrizeSoftPity && !box.mainPrizeHardPity) {
        errors.push(`${prefix}.mainPrizeSoftPity is not expected`);
    }
    if (!validateOptionalStrictlyPositiveInt(box.secondaryPrizeHardPity)) {
        errors.push(`${prefix}.secondaryPrizeHardPity is invalid`);
    }
    if (!validateOptionalStrictlyPositiveInt(box.secondaryPrizeSoftPity)) {
        errors.push(`${prefix}.secondaryPrizeSoftPity is invalid`);
    }
    if (box.secondaryPrizeSoftPity && !box.secondaryPrizeHardPity) {
        errors.push(`${prefix}.secondaryPrizeSoftPity is not expected`);
    }
    if (!validateRequiredEnum(box.mainPrizeDuplicates, ['allowed', 'replace_individual', 'replace_all', 'remove'])) {
        errors.push(`${prefix}.mainPrizeDuplicates is invalid`);
    }
    if (box.mainPrizeDuplicates === 'replace_all') {
        errors.push(
            ...validateLootDropSubstitute(box.mainPrizeSubstitute, 'mainPrizeSubstitute').map(
                (error) => `${prefix}.${error}`,
            ),
        );
    }
    if (
        !validateRequiredEnum(box.secondaryPrizeDuplicates, ['allowed', 'replace_individual', 'replace_all', 'remove'])
    ) {
        errors.push(`${prefix}.secondaryPrizeDuplicates is invalid`);
    }
    if (box.secondaryPrizeDuplicates === 'replace_all') {
        errors.push(
            ...validateLootDropSubstitute(box.secondaryPrizeSubstitute, 'secondaryPrizeSubstitute').map(
                (error) => `${prefix}.${error}`,
            ),
        );
    }
    if (!validateRequiredArray(box.lootSlots)) {
        errors.push(`${prefix}.lootSlots is invalid`);
    }

    let mainPrizeSlots = 0;
    let secondaryPrizeSlots = 0;
    const expectMainSubstitute =
        box.mainPrizeDuplicates === 'replace_individual' ||
        (box.mainPrizeDuplicates === 'remove' && !box.mainPrizeSubstitute);
    const expectSecSubstitute =
        box.mainPrizeDuplicates === 'replace_individual' ||
        (box.secondaryPrizeDuplicates === 'remove' && !box.secondaryPrizeSubstitute);
    const expectSlotLevelContentType = !!box.mainPrizeSoftPity && !!box.secondaryPrizeSoftPity;
    box.lootSlots?.forEach((slot, index) => {
        errors.push(
            ...validateLootSlot(slot, index, expectMainSubstitute, expectSecSubstitute, expectSlotLevelContentType).map(
                (error) => `${prefix}.${error}`,
            ),
        );
        if (slot.contentType === 'main') mainPrizeSlots++;
        mainPrizeSlots += slot.lootGroups?.filter((group) => group.contentType === 'main')?.length || 0;
        if (slot.contentType === 'secondary') secondaryPrizeSlots++;
        secondaryPrizeSlots += slot.lootGroups?.filter((group) => group.contentType === 'secondary')?.length || 0;
    });
    if (mainPrizeSlots !== 1 || secondaryPrizeSlots > 1) {
        errors.push(`${prefix}.lootSlots has an invalid number of non-filler slots`);
    }

    return errors;
};

export const validateLootTable = (table: LootTable): string[] => {
    if (!table) return [`LootTable is null`];
    const errors = [];

    if (!validateRequiredString(table.game)) {
        errors.push(`game is invalid`);
    }
    if (!validateRequiredString(table.eventName)) {
        errors.push(`eventName is invalid`);
    }
    if (!validateRequiredDate(table.startDate)) {
        errors.push(`startDate is invalid`);
    }
    if (!validateRequiredDate(table.endDate)) {
        errors.push(`endDate is invalid`);
    }
    if (!validateRequiredBoolean(table.recursive)) {
        errors.push(`recursive is invalid`);
    }
    if (!validateRequiredBoolean(table.autoOpenRecursive)) {
        errors.push(`autoOpenRecursive is invalid`);
    }
    if (table.autoOpenRecursive && !table.recursive) {
        errors.push(`autoOpenRecursive is cannot be true if recursive is false`);
    }
    if (!validateRequiredString(table.author)) {
        errors.push(`author is invalid`);
    }
    if (!validateRequiredString(table.source)) {
        errors.push(`source is invalid`);
    }
    if (!validateOptionalString(table.notes)) {
        errors.push(`notes is invalid`);
    }
    if (!validateRequiredArray(table.lootboxes)) {
        errors.push(`lootboxes is invalid`);
    }
    if (!table.recursive && table.lootboxes?.length > 1) {
        errors.push(`lootboxes should only contain 1 entry`);
    }

    let foundPurchaseable = false;
    table.lootboxes?.forEach((box, index) => {
        errors.push(...validateLootbox(box, index).map((error) => `${error}`));
        foundPurchaseable = foundPurchaseable || box.purchasable;
    });
    if (!foundPurchaseable) {
        errors.push(`lootboxes should contain at least one purchasable lootbox`);
    }

    return errors;
};
