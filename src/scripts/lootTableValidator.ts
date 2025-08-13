import type { Lootbox, LootDrop, LootDropSubstitute, LootGroup, LootSlot, LootTable } from '../types/lootTable';

type Maybe<T> = T | undefined | null;

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

export const validateRequiredPositiveInt = (obj: unknown): boolean => {
    return typeof obj === 'number' && Number.isInteger(obj) && obj > 0;
};

export const validateOptionalString = (obj: unknown): boolean => {
    return !obj || (typeof obj === 'string' && obj.trim().length > 0);
};

export const validateOptionalUrl = (obj: unknown): boolean => {
    return (
        !obj ||
        (typeof obj === 'string' &&
            /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/.test(
                obj,
            ))
    );
};

export const validateOptionalPositiveInt = (obj: unknown): boolean => {
    return !obj || (typeof obj === 'number' && Number.isInteger(obj) && obj > 0);
};

// Loot table structure

export const validateLootDropSubstitute = (substitute: Maybe<LootDropSubstitute>, fieldName?: string): string[] => {
    const prefix = fieldName || 'substitute';
    if (!substitute) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(substitute.name)) {
        errors.push(`${prefix}.name is invalid`);
    }
    if (!validateOptionalUrl(substitute.pictureUrl)) {
        errors.push(`${prefix}.pictureUrl is invalid`);
    }
    if (!validateOptionalUrl(substitute.backgroundUrl)) {
        errors.push(`${prefix}.backgroundUrl is invalid`);
    }
    if (!validateRequiredPositiveInt(substitute.amount)) {
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
    if (!validateOptionalUrl(drop.pictureUrl)) {
        errors.push(`${prefix}.pictureUrl is invalid`);
    }
    if (!validateOptionalUrl(drop.backgroundUrl)) {
        errors.push(`${prefix}.backgroundUrl is invalid`);
    }
    if (!validateRequiredDropRate(drop.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (!validateRequiredPositiveInt(drop.amount)) {
        errors.push(`${prefix}.amount is invalid`);
    }
    if (expectSubstitute) {
        errors.push(...validateLootDropSubstitute(drop.substitute).map((error) => `${prefix}.${error}`));
    } else if (drop.substitute) {
        errors.push(`${prefix}.substitute should not be present`);
    }

    return errors;
};

export const validateLootGroup = (group: LootGroup, selfIndex: number, expectSubstitute: boolean): string[] => {
    const prefix = `lootGroups[${selfIndex}]`;
    if (!group) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(group.alias)) {
        errors.push(`${prefix}.alias is invalid`);
    }
    if (!validateRequiredDropRate(group.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (!validateRequiredArray(group.lootDrops)) {
        errors.push(`${prefix}.lootDrops is invalid`);
    }

    let dropRatesTotal = 0;
    group.lootDrops.forEach((drop, index) => {
        errors.push(...validateLootDrop(drop, index, expectSubstitute).map((error) => `${prefix}.${error}`));
        dropRatesTotal += drop.dropRate ?? 0;
    });
    if (Number(dropRatesTotal.toFixed(6)) !== 1) {
        errors.push(`${prefix}.lootDrops has an invalid total dropRate of ${dropRatesTotal}`);
    }

    return errors;
};

export const validateLootSlot = (slot: LootSlot, selfIndex: number, expectSubstitute: boolean): string[] => {
    const prefix = `lootSlots[${selfIndex}]`;
    if (!slot) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(slot.alias)) {
        errors.push(`${prefix}.alias is invalid`);
    }
    if (!validateRequiredDropRate(slot.dropRate)) {
        errors.push(`${prefix}.dropRate is invalid`);
    }
    if (!validateRequiredEnum(slot.contentType, ['main_prize', 'lootbox', 'filler'])) {
        errors.push(`${prefix}.contentType is invalid`);
    }
    if (!validateRequiredArray(slot.lootGroups)) {
        errors.push(`${prefix}.lootGroups is invalid`);
    }

    let dropRatesTotal = 0;
    slot.lootGroups.forEach((group, index) => {
        errors.push(...validateLootGroup(group, index, expectSubstitute).map((error) => `${prefix}.${error}`));
        dropRatesTotal += group.dropRate ?? 0;
    });
    if (Number(dropRatesTotal.toFixed(6)) !== 1) {
        errors.push(`${prefix}.lootGroups has an invalid total dropRate of ${dropRatesTotal}`);
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
    if (!validateOptionalPositiveInt(box.pity)) {
        errors.push(`${prefix}.pity is invalid`);
    }
    if (
        !validateRequiredEnum(box.mainPrizeDuplicates, [
            'allowed',
            'replace_individual',
            'replace_all',
            'remove_even',
            'remove_prop',
        ])
    ) {
        errors.push(`${prefix}.mainPrizeDuplicates is invalid`);
    }
    if (box.mainPrizeDuplicates === 'replace_all') {
        errors.push(
            ...validateLootDropSubstitute(box.mainPrizeSubstitute, 'mainPrizeSubstitute').map(
                (error) => `${prefix}.${error}`,
            ),
        );
    }
    if (!validateRequiredArray(box.lootSlots)) {
        errors.push(`${prefix}.lootSlots is invalid`);
    }

    let mainPrizeSlots = 0;
    let lootboxSlots = 0;
    const expectSubstitute =
        box.mainPrizeDuplicates === 'replace_individual' ||
        (['remove_even', 'remove_prop'].includes(box.mainPrizeDuplicates) && !box.mainPrizeSubstitute);
    box.lootSlots.forEach((slot, index) => {
        errors.push(...validateLootSlot(slot, index, expectSubstitute).map((error) => `${prefix}.${error}`));
        if (slot.contentType === 'main_prize') mainPrizeSlots++;
        if (slot.contentType === 'lootbox') lootboxSlots++;
    });
    if (mainPrizeSlots !== 1 || lootboxSlots > 1) {
        errors.push(`${prefix}.lootSlots has an invalid number of non-filler slots`);
    }

    return errors;
};

export const validateLootTable = (table: LootTable): string[] => {
    const prefix = `LootTable`;
    if (!table) return [`${prefix} is null`];
    const errors = [];

    if (!validateRequiredString(table.game)) {
        errors.push(`${prefix}.game is invalid`);
    }
    if (!validateRequiredString(table.eventName)) {
        errors.push(`${prefix}.eventName is invalid`);
    }
    if (!validateRequiredDate(table.startDate)) {
        errors.push(`${prefix}.startDate is invalid`);
    }
    if (!validateRequiredDate(table.endDate)) {
        errors.push(`${prefix}.endDate is invalid`);
    }
    if (!validateRequiredBoolean(table.recursive)) {
        errors.push(`${prefix}.recursive is invalid`);
    }
    if (!validateRequiredString(table.author)) {
        errors.push(`${prefix}.author is invalid`);
    }
    if (!validateRequiredString(table.source)) {
        errors.push(`${prefix}.source is invalid`);
    }
    if (!validateOptionalString(table.notes)) {
        errors.push(`${prefix}.notes is invalid`);
    }
    if (!validateRequiredArray(table.lootboxes)) {
        errors.push(`${prefix}.lootboxes is invalid`);
    }
    if (!table.recursive && table.lootboxes?.length > 1) {
        errors.push(`${prefix}.lootboxes should only contain 1 entry`);
    }

    table.lootboxes.forEach((box, index) => {
        errors.push(...validateLootbox(box, index).map((error) => `${prefix}.${error}`));
    });

    return errors;
};
