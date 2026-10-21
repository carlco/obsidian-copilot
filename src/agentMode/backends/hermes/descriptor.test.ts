import { translateBackendState } from "@/agentMode/session/translateBackendState";
import type { BackendState, ModelSelectionSession } from "@/agentMode/session/types";
import { getSettings, setSettings } from "@/settings/model";
import { detectBinary } from "@/utils/detectBinary";
import {
  HermesBackendDescriptor,
  detectHermesPath,
  hermesInstallState,
  hermesSearchDirs,
  hermesWire,
} from "./descriptor";

jest.mock("@/utils/detectBinary", () => ({ detectBinary: jest.fn() }));

const mockedDetectBinary = jest.mocked(detectBinary);

function useHermesSettings(hermes?: Record<string, unknown>): void {
  setSettings({
    agentMode: {
      byok: {},
      activeBackend: "hermes",
      debugFullFrames: false,
      offerFeedbackCards: true,
      notificationSound: false,
      notificationSoundId: "piano",
      welcomeDismissed: false,
      skills: { folder: "copilot/skills" },
      backends: hermes ? { hermes } : {},
    },
  });
}

function sessionOnModel(baseModelId: string): ModelSelectionSession & {
  applyModelWireId: jest.Mock;
} {
  const state = {
    model: { current: { baseModelId, effort: null }, availableModels: [], apply: {} },
    mode: null,
  } as unknown as BackendState;
  return {
    getState: () => state,
    applyModelWireId: jest.fn(async () => undefined),
    setConfigOption: jest.fn(async () => undefined),
  };
}

describe("descriptor", () => {
  beforeEach(() => {
    mockedDetectBinary.mockReset();
  });

  describe("hermesInstallState()", () => {
    it("is ready when the configured binary exists", () => {
      expect(hermesInstallState("/usr/local/bin/hermes", () => true)).toEqual({
        kind: "ready",
        source: "custom",
      });
    });

    it("is absent when no binary path is configured", () => {
      expect(hermesInstallState(undefined, () => true)).toEqual({ kind: "absent" });
    });

    it("reports an error naming the path when the configured binary is gone", () => {
      expect(hermesInstallState("/gone/hermes", () => false)).toEqual({
        kind: "error",
        message: "Hermes CLI not found at /gone/hermes.",
      });
    });
  });

  describe("hermesSearchDirs()", () => {
    it("searches the user's ~/.local/bin, where the Hermes installer links the CLI", () => {
      expect(hermesSearchDirs("/home/me")).toEqual(["/home/me/.local/bin"]);
    });
  });

  describe("detectHermesPath()", () => {
    it("returns the hermes binary found on PATH", async () => {
      mockedDetectBinary.mockResolvedValue("/opt/homebrew/bin/hermes");

      await expect(detectHermesPath()).resolves.toBe("/opt/homebrew/bin/hermes");
      expect(mockedDetectBinary).toHaveBeenCalledWith("hermes");
    });
  });

  describe("hermesWire", () => {
    it("round-trips Hermes provider:model ids unchanged with no effort", () => {
      const decoded = hermesWire.decode("openrouter:anthropic/claude-sonnet-4");

      expect(decoded).toEqual({
        selection: { baseModelId: "openrouter:anthropic/claude-sonnet-4", effort: null },
        provider: null,
      });
      expect(hermesWire.encode(decoded.selection)).toBe("openrouter:anthropic/claude-sonnet-4");
    });
  });

  describe("HermesBackendDescriptor", () => {
    describe("getInstallState()", () => {
      it("is absent before a hermes path is saved", () => {
        useHermesSettings();

        expect(HermesBackendDescriptor.getInstallState(getSettings())).toEqual({
          kind: "absent",
        });
      });
    });

    describe("getResolvedBinaryPath()", () => {
      it("returns the saved hermes path", () => {
        useHermesSettings({ binaryPath: "/usr/local/bin/hermes" });

        expect(HermesBackendDescriptor.getResolvedBinaryPath?.(getSettings())).toBe(
          "/usr/local/bin/hermes"
        );
      });
    });

    describe("onPluginLoad()", () => {
      it("saves the auto-detected hermes path when none is configured", async () => {
        useHermesSettings();
        mockedDetectBinary.mockResolvedValue("/usr/local/bin/hermes");

        await HermesBackendDescriptor.onPluginLoad?.({} as never);

        expect(getSettings().agentMode.backends.hermes?.binaryPath).toBe("/usr/local/bin/hermes");
      });

      it("keeps a saved hermes path without probing", async () => {
        useHermesSettings({ binaryPath: "/custom/hermes" });

        await HermesBackendDescriptor.onPluginLoad?.({} as never);

        expect(mockedDetectBinary).not.toHaveBeenCalled();
        expect(getSettings().agentMode.backends.hermes?.binaryPath).toBe("/custom/hermes");
      });
    });

    describe("presentPermissionOption()", () => {
      it("explains that Allow for session lasts until the chat ends", () => {
        const option = HermesBackendDescriptor.presentPermissionOption?.(
          { optionId: "allow_session", kind: "allow_always", name: "Allow for session" },
          undefined
        );

        expect(option?.description).toBe("Covers this command until this chat ends.");
      });

      it("explains that Allow always writes Hermes's command allowlist", () => {
        const option = HermesBackendDescriptor.presentPermissionOption?.(
          { optionId: "allow_always", kind: "allow_always", name: "Allow always" },
          undefined
        );

        expect(option?.description).toContain("command_allowlist");
      });

      it("leaves one-shot options unchanged", () => {
        const allowOnce = { optionId: "allow_once", kind: "allow_once" as const, name: "Allow" };

        expect(HermesBackendDescriptor.presentPermissionOption?.(allowOnce, undefined)).toBe(
          allowOnce
        );
      });
    });

    describe("applySelection()", () => {
      it("switches the session to the selected Hermes model", async () => {
        const session = sessionOnModel("openrouter:a");

        await HermesBackendDescriptor.applySelection(session, {
          baseModelId: "anthropic:claude-opus",
          effort: null,
        });

        expect(session.applyModelWireId).toHaveBeenCalledWith("anthropic:claude-opus");
      });

      it("skips the switch when the session already runs the selected model", async () => {
        const session = sessionOnModel("openrouter:a");

        await HermesBackendDescriptor.applySelection(session, {
          baseModelId: "openrouter:a",
          effort: null,
        });

        expect(session.applyModelWireId).not.toHaveBeenCalled();
      });
    });

    describe("getModeMapping()", () => {
      it("offers Default and Auto from Hermes's default and dont_ask modes", () => {
        const state = translateBackendState(
          {
            models: null,
            configOptions: null,
            modes: {
              currentModeId: "dont_ask",
              availableModes: [
                { id: "default", name: "Default" },
                { id: "accept_edits", name: "Accept Edits" },
                { id: "dont_ask", name: "Don't Ask" },
              ],
            },
          },
          HermesBackendDescriptor
        );

        expect(state.mode?.options.map((o) => o.value)).toEqual(["default", "auto"]);
        expect(state.mode?.current).toBe("auto");
        expect(state.mode?.apply.auto).toEqual({ kind: "setMode", nativeId: "dont_ask" });
      });
    });
  });
});
