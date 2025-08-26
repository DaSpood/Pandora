import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateLootTable } from '../scripts/lootTableValidator';

import type { LootTable } from '../types/lootTable';

const LOOT_TABLES_DIRPATH = path.resolve(__dirname, '../assets/lootTables');

describe('LootTableValidator', () => {
    const lootTables = fs.readdirSync(LOOT_TABLES_DIRPATH).map((f) => path.resolve(LOOT_TABLES_DIRPATH, f));

    it(`should fail validation with invalid lootTable`, () => {
        const lootTable = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, './invalid.json')).toString(),
        ) as unknown as LootTable;

        const expectedErrors = [
            'startDate is invalid',
            'autoOpenRecursive is cannot be true if recursive is false',
            'source is invalid',
            'lootboxes should only contain 1 entry',
            'lootboxes[0].secondaryPrizeDuplicates is invalid',
            'lootboxes[0].lootSlots[0].dropRate is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].dropRate is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].name is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].pictureUrl is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].amount is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].substitute should not be present',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[1].dropRate is invalid',
            'lootboxes[0].lootSlots[0].lootGroups[0].lootDrops has an invalid total dropRate of 0.8',
            'lootboxes[0].lootSlots[0].lootGroups has an invalid total dropRate of 0.5',
            'lootboxes[0].lootSlots has an invalid number of non-filler slots',
            'lootboxes[1].lootSlots[1].lootGroups has an invalid total dropRate of 0.34',
            'lootboxes should contain at least one purchasable lootbox',
        ];

        const errors = validateLootTable(lootTable);
        expect(errors).toEqual(expectedErrors);
    });

    describe.each(lootTables)('Validate hosted loot tables', (tableFile) => {
        it(`should pass validation with file ${tableFile}`, () => {
            const lootTable = JSON.parse(fs.readFileSync(tableFile).toString()) as unknown as LootTable;
            const errors = validateLootTable(lootTable);
            expect(errors).toEqual([]);
        });
    });
});
