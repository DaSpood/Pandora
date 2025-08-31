import { openUntilMultipleIterations } from './openingSessionManager.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const self = globalThis as any;

self.onmessage = (event: MessageEvent) => {
    const { rawInitialSession, iterations, workerId } = event.data;

    // Avoid duplicate calls
    if (Object.keys(self).includes(`worker_${workerId}_working`)) return;

    self[`worker_${workerId}_working`] = true;
    const result = openUntilMultipleIterations(rawInitialSession, iterations);
    postMessage({ workerId, result });
    delete self[`worker_${workerId}_working`];
};
