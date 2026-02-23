import * as os from "os";

export const NON_PREMIUM_DOWNLOAD_THREADS = 1;
export const PREMIUM_DOWNLOAD_THREADS_MAX = 16;

function safeCpuCount(): number {
  try {
    return Math.max(1, os.cpus()?.length ?? 1);
  } catch {
    return 1;
  }
}

function premiumCpuThreadCap(cpuCount: number): number {
  if (cpuCount >= 16) {
    return 16;
  }
  if (cpuCount >= 12) {
    return 14;
  }
  if (cpuCount >= 8) {
    return 12;
  }
  if (cpuCount >= 6) {
    return 10;
  }
  if (cpuCount >= 4) {
    return 8;
  }
  return 6;
}

export function effectiveDownloadThreads(
  requested: number,
  isPremium: boolean,
): number {
  if (!isPremium) {
    return NON_PREMIUM_DOWNLOAD_THREADS;
  }

  const safeRequested = Number.isFinite(requested)
    ? Math.max(1, Math.floor(requested))
    : NON_PREMIUM_DOWNLOAD_THREADS;
  const cpuCap = premiumCpuThreadCap(safeCpuCount());
  return Math.min(safeRequested, PREMIUM_DOWNLOAD_THREADS_MAX, cpuCap);
}
