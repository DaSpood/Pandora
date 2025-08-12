import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateLootTable } from '../scripts/lootTableValidator';

import type { LootTable } from '../types/lootTable';

const LOOT_TABLES_DIRPATH = __dirname + '../../../public/lootTables';

describe('LootTableValidator', () => {
    const lootTables = fs.readdirSync(LOOT_TABLES_DIRPATH).map((f) => path.resolve(LOOT_TABLES_DIRPATH, f));

    it(`should fail validation with invalid lootTable`, () => {
        // FIXME: copy the original operation_pandora table and introduce a bunch of errors to test
        const lootTable = null as unknown as LootTable;

        const expectedErrors = ['LootTable is null'];

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
