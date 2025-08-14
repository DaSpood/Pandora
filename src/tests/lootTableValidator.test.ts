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
            'LootTable.startDate is invalid',
            'LootTable.source is invalid',
            'LootTable.lootboxes should only contain 1 entry',
            'LootTable.lootboxes[0].lootSlots[0].dropRate is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].dropRate is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].name is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].pictureUrl is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].amount is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[0].substitute should not be present',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops[1].dropRate is invalid',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups[0].lootDrops has an invalid total dropRate of 0.8',
            'LootTable.lootboxes[0].lootSlots[0].lootGroups has an invalid total dropRate of 0.5',
            'LootTable.lootboxes[0].lootSlots has an invalid number of non-filler slots',
            'LootTable.lootboxes[1].lootSlots[0].lootGroups[0].lootDrops[0].substitute is null',
            'LootTable.lootboxes[1].lootSlots[0].lootGroups[0].lootDrops[1].substitute is null',
            'LootTable.lootboxes[1].lootSlots[0].lootGroups[0].lootDrops[2].substitute is null',
            'LootTable.lootboxes[1].lootSlots[1].lootGroups has an invalid total dropRate of 0.34',
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
