import { types, util } from "vortex-api";
import * as actions from "../actions/installTracking";

// Initial state
const isDownloadedStatus = (status: types.CollectionModStatus): boolean =>
  ["downloaded", "downloading", "installed", "installing", "skipped"].includes(
    status,
  );

const statusCounterDelta = (
  oldStatus: types.CollectionModStatus,
  newStatus: types.CollectionModStatus,
) => {
  const downloadedDelta =
    (isDownloadedStatus(newStatus) ? 1 : 0) -
    (isDownloadedStatus(oldStatus) ? 1 : 0);
  const installedDelta =
    (newStatus === "installed" ? 1 : 0) - (oldStatus === "installed" ? 1 : 0);
  const failedDelta =
    (newStatus === "failed" ? 1 : 0) - (oldStatus === "failed" ? 1 : 0);
  const skippedDelta =
    (newStatus === "skipped" ? 1 : 0) - (oldStatus === "skipped" ? 1 : 0);

  return { downloadedDelta, installedDelta, failedDelta, skippedDelta };
};

const initialState: types.ICollectionInstallState = {
  activeSession: undefined,
  lastActiveSessionId: undefined,
  sessionHistory: {},
};

const collectionInstallReducer = {
  reducers: {
    [actions.startInstallSession as any]: (
      state: types.ICollectionInstallState,
      payload: any,
    ) => {
      const sessionId = util.generateCollectionSessionId(
        payload.collectionId,
        payload.profileId,
      );
      const mods = payload.mods as { [ruleId: string]: any };
      const downloadedCount = Object.values(mods).filter((mod) =>
        [
          "downloaded",
          "downloading",
          "installed",
          "installing",
          "skipped",
        ].includes(mod.status),
      ).length;
      const installedCount = Object.values(mods).filter(
        (mod) => mod.status === "installed",
      ).length;
      const session: types.ICollectionInstallSession = {
        ...payload,
        sessionId,
        downloadedCount,
        installedCount,
        failedCount: 0,
        skippedCount: 0,
      };

      return util.setSafe(state, ["activeSession"], session);
    },

    [actions.updateModStatus as any]: (
      state: types.ICollectionInstallState,
      payload: any,
    ) => {
      if (
        !state.activeSession ||
        state.activeSession.sessionId !== payload.sessionId
      ) {
        return state;
      }

      const currentMod = state.activeSession.mods[payload.ruleId];
      if (currentMod == null) {
        return state;
      }

      const oldStatus = currentMod.status;
      const newStatus = payload.status as types.CollectionModStatus;
      if (oldStatus === newStatus) {
        return state;
      }

      const modPath = ["activeSession", "mods", payload.ruleId];
      const updatedState = util.setSafe(
        state,
        [...modPath, "status"],
        newStatus,
      );

      const { downloadedDelta, installedDelta, failedDelta, skippedDelta } =
        statusCounterDelta(oldStatus, newStatus);

      return util.merge(updatedState, ["activeSession"], {
        downloadedCount:
          updatedState.activeSession!.downloadedCount + downloadedDelta,
        installedCount:
          updatedState.activeSession!.installedCount + installedDelta,
        failedCount: updatedState.activeSession!.failedCount + failedDelta,
        skippedCount: updatedState.activeSession!.skippedCount + skippedDelta,
      });
    },

    [actions.markModInstalled as any]: (
      state: types.ICollectionInstallState,
      payload: any,
    ) => {
      if (
        !state.activeSession ||
        state.activeSession.sessionId !== payload.sessionId
      ) {
        return state;
      }

      const currentMod = state.activeSession.mods[payload.ruleId];
      if (currentMod == null) {
        return state;
      }

      const oldStatus = currentMod.status;
      const newStatus: types.CollectionModStatus = "installed";

      let newState = util.setSafe(
        state,
        ["activeSession", "mods", payload.ruleId, "modId"],
        payload.modId,
      );
      newState = util.setSafe(
        newState,
        ["activeSession", "mods", payload.ruleId, "status"],
        newStatus,
      );
      newState = util.setSafe(
        newState,
        ["activeSession", "mods", payload.ruleId, "endTime"],
        Date.now(),
      );

      const { downloadedDelta, installedDelta, failedDelta, skippedDelta } =
        statusCounterDelta(oldStatus, newStatus);

      return util.merge(newState, ["activeSession"], {
        downloadedCount:
          newState.activeSession!.downloadedCount + downloadedDelta,
        installedCount: newState.activeSession!.installedCount + installedDelta,
        failedCount: newState.activeSession!.failedCount + failedDelta,
        skippedCount: newState.activeSession!.skippedCount + skippedDelta,
      });
    },

    [actions.finishInstallSession as any]: (
      state: types.ICollectionInstallState,
      payload: any,
    ) => {
      if (
        !state.activeSession ||
        state.activeSession.sessionId !== payload.sessionId
      ) {
        return state;
      }

      let newState = util.setSafe(
        state,
        ["sessionHistory", payload.sessionId],
        state.activeSession,
      );
      newState = util.setSafe(
        newState,
        ["lastActiveSessionId"],
        payload.sessionId,
      );
      newState = util.setSafe(newState, ["activeSession"], undefined);

      return newState;
    },
  },

  defaults: initialState,
};

export default collectionInstallReducer;
