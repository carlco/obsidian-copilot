import { setSettings } from "@/settings/model";
import { HermesBackend } from "./HermesBackend";

jest.mock("@/agentMode/backends/shared/builtinSkillEnv", () => ({
  ...jest.requireActual("@/agentMode/backends/shared/builtinSkillEnv"),
  buildBuiltinSkillEnv: jest.fn(async () => ({ COPILOT_MANAGED: "1" })),
}));

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

describe("HermesBackend", () => {
  describe("HermesBackend", () => {
    describe("buildSpawnDescriptor()", () => {
      it("runs the configured hermes binary with the acp subcommand", async () => {
        useHermesSettings({ binaryPath: "/home/me/.local/bin/hermes" });

        const spawn = await new HermesBackend().buildSpawnDescriptor({ vaultBasePath: "/vault" });

        expect(spawn.command).toBe("/home/me/.local/bin/hermes");
        expect(spawn.args).toEqual(["acp"]);
      });

      it("layers user env overrides over Copilot's managed env", async () => {
        useHermesSettings({
          binaryPath: "/usr/local/bin/hermes",
          envOverrides: { HERMES_HOME: "/data/hermes", COPILOT_MANAGED: "user" },
        });

        const spawn = await new HermesBackend().buildSpawnDescriptor({ vaultBasePath: "/vault" });

        expect(spawn.env.HERMES_HOME).toBe("/data/hermes");
        expect(spawn.env.COPILOT_MANAGED).toBe("user");
      });

      it("rejects with a setup hint when no hermes path is configured", async () => {
        useHermesSettings();

        await expect(
          new HermesBackend().buildSpawnDescriptor({ vaultBasePath: "/vault" })
        ).rejects.toThrow("Hermes path not configured");
      });
    });
  });
});
