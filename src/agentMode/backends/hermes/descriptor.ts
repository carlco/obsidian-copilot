import type CopilotPlugin from "@/main";
import {
  getSettings,
  subscribeToSettingsChange,
  updateAgentModeBackendFields,
  type CopilotSettings,
  type HermesBackendSettings,
} from "@/settings/model";
import { requireNodeModule } from "@/utils/desktopRuntime";
import { detectBinary } from "@/utils/detectBinary";
import { agentOriginEnabledModelEntries } from "@/agentMode/backends/shared/agentEnabledModels";
import { simpleBinaryBackendProcess } from "@/agentMode/backends/shared/simpleBinaryBackend";
import type {
  BackendDescriptor,
  BackendProcess,
  EnabledModelEntry,
  InstallState,
  ModeMapping,
  ModelSelection,
  ModelSelectionSession,
  ModelWireCodec,
  PermissionOption,
} from "@/agentMode/session/types";
import { HermesBackend } from "./HermesBackend";
import { HermesInstallModal } from "./HermesInstallModal";
import { HermesSettingsPanel } from "./HermesSettingsPanel";
import HermesLogo from "./logo.svg";

export const HERMES_BINARY_NAME = "hermes";

const ABSENT: InstallState = Object.freeze({ kind: "absent" });
const READY: InstallState = Object.freeze({ kind: "ready", source: "custom" });

export function updateHermesFields(partial: Partial<HermesBackendSettings>): void {
  updateAgentModeBackendFields("hermes", partial);
}

export function hermesInstallState(
  binaryPath: string | undefined,
  exists: (path: string) => boolean
): InstallState {
  if (!binaryPath) return ABSENT;
  if (exists(binaryPath)) return READY;
  return { kind: "error", message: `Hermes CLI not found at ${binaryPath}.` };
}

export function hermesSearchDirs(homeDir: string): string[] {
  return [`${homeDir}/.local/bin`];
}

export async function detectHermesPath(): Promise<string | null> {
  const fromPath = await detectBinary(HERMES_BINARY_NAME);
  if (fromPath) return fromPath;
  const fs = requireNodeModule<typeof import("node:fs")>("fs");
  const os = requireNodeModule<typeof import("node:os")>("os");
  const candidate = hermesSearchDirs(os.homedir())
    .map((dir) => `${dir}/${HERMES_BINARY_NAME}`)
    .find((path) => fs.existsSync(path));
  return candidate ?? null;
}

export function hermesDetectionSearchDirs(): string[] {
  const os = requireNodeModule<typeof import("node:os")>("os");
  return hermesSearchDirs(os.homedir());
}

function binaryExists(path: string): boolean {
  return requireNodeModule<typeof import("node:fs")>("fs").existsSync(path);
}

export const hermesWire: ModelWireCodec = {
  encode: (selection: ModelSelection) => selection.baseModelId,
  decode: (wireId: string) => ({
    selection: { baseModelId: wireId, effort: null },
    provider: null,
  }),
};

export const HERMES_MODE_MAPPING: ModeMapping = Object.freeze({
  kind: "setMode",
  canonical: Object.freeze({ default: "default", auto: "dont_ask" }),
});

const HERMES_PERMISSION_SCOPES: Readonly<Record<string, string>> = Object.freeze({
  allow_session: "Covers this command until this chat ends.",
  allow_always:
    "Saved to command_allowlist in your Hermes config (~/.hermes/config.yaml) for all later Hermes chats. Remove it there to undo.",
});

export const HermesBackendDescriptor: BackendDescriptor = {
  id: "hermes",
  displayName: "Hermes",
  Icon: HermesLogo,
  selfHostable: true,
  routesCopilotModels: false,
  setupDescription:
    "Nous Research's Hermes Agent, with its own memory, skills and model providers. Runs `hermes acp` on your machine.",
  skillsProjectDir: ".hermes/skills",
  crossDiscoveredAgents: [],
  restartOnManagedSkillsChange: false,
  restartOnProviderConfigChange: false,
  restartOnSystemPromptChange: false,
  summarizesSessionTitle: true,
  wire: hermesWire,

  getEnabledModelEntries(settings: CopilotSettings): EnabledModelEntry[] {
    return [
      ...agentOriginEnabledModelEntries(settings, "hermes", (wireId) => hermesWire.decode(wireId)),
    ];
  },

  presentPermissionOption(option: PermissionOption): PermissionOption {
    const description = HERMES_PERMISSION_SCOPES[option.optionId];
    return description ? { ...option, description } : option;
  },

  getInstallState(settings: CopilotSettings): InstallState {
    return hermesInstallState(settings.agentMode?.backends?.hermes?.binaryPath, binaryExists);
  },

  getResolvedBinaryPath(settings: CopilotSettings): string | null {
    return settings.agentMode?.backends?.hermes?.binaryPath ?? null;
  },

  subscribeInstallState(_plugin: CopilotPlugin, cb: () => void): () => void {
    return subscribeToSettingsChange((prev, next) => {
      if (
        prev.agentMode?.backends?.hermes?.binaryPath !==
        next.agentMode?.backends?.hermes?.binaryPath
      ) {
        cb();
      }
    });
  },

  openInstallUI(plugin: CopilotPlugin): void {
    new HermesInstallModal(plugin.app).open();
  },

  async onPluginLoad(): Promise<void> {
    if (getSettings().agentMode?.backends?.hermes?.binaryPath) return;
    const detected = await detectHermesPath();
    if (detected) updateHermesFields({ binaryPath: detected });
  },

  async applySelection(session: ModelSelectionSession, selection: ModelSelection): Promise<void> {
    if (session.getState()?.model?.current.baseModelId === selection.baseModelId) return;
    await session.applyModelWireId(hermesWire.encode(selection));
  },

  createBackendProcess(args): BackendProcess {
    return simpleBinaryBackendProcess(args, new HermesBackend(args.clientVersion));
  },

  SettingsPanel: HermesSettingsPanel,

  getModeMapping(): ModeMapping {
    return HERMES_MODE_MAPPING;
  },
};
