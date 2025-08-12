import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
    verbose: false,
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.{ts,tsx}'],
    transform: {
        '^.+\\.(ts|tsx)?$': ['ts-jest', { diagnostics: { ignoreCodes: ['TS151001'] } }],
    },
};
process.env.TZ = 'UTC';
export default config;
