import { BinaryPathSetting } from "@/agentMode/backends/shared/BinaryPathSetting";
import {
  ConfigDialogShell,
  ConfigSection,
  ConfigWarningStrip,
} from "@/agentMode/backends/shared/ui/ConfigDialogShell";
import { CommandBlock } from "@/agentMode/backends/shared/ui/SetupSteps";
import type { InstallState } from "@/agentMode/session/types";
import React from "react";

export const HERMES_INSTALL_COMMAND =
  "curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash";
export const HERMES_SETUP_COMMAND = "hermes setup";

export interface HermesConfigViewProps {
  state: InstallState;
  binaryPath: string;
  onSavePath: (path: string) => Promise<string | null>;
  onClearPath: () => void;
  detect: () => Promise<string | null>;
  searchedDirs: () => string[];
  onClose: () => void;
}

export const HermesConfigView: React.FC<HermesConfigViewProps> = ({
  state,
  binaryPath,
  onSavePath,
  onClearPath,
  detect,
  searchedDirs,
  onClose,
}) => (
  <ConfigDialogShell
    title="Configure Hermes"
    state={state}
    warning={<ConfigWarningStrip state={state} />}
    onClose={onClose}
  >
    <ConfigSection title="Hermes CLI">
      <p className="tw-my-0 tw-text-sm tw-text-muted">
        Copilot runs <code>hermes acp</code> on this machine. Auto-detect checks your PATH and
        ~/.local/bin.
      </p>
      <BinaryPathSetting
        binaryName="hermes"
        placeholder="/absolute/path/to/hermes"
        initialPath={binaryPath}
        notFoundHint="hermes not found. Run the install command below, then click Auto-detect again."
        onSave={onSavePath}
        onClear={onClearPath}
        persistOnAutoDetect
        detect={detect}
        searchedDirs={searchedDirs}
      />
    </ConfigSection>

    <ConfigSection title="Install Hermes">
      <CommandBlock command={HERMES_INSTALL_COMMAND} />
    </ConfigSection>

    <ConfigSection title="Choose a model provider">
      <p className="tw-my-0 tw-text-sm tw-text-muted">
        Hermes uses the provider and API keys from its own config. Run setup once in a terminal
        before the first chat.
      </p>
      <CommandBlock command={HERMES_SETUP_COMMAND} />
    </ConfigSection>
  </ConfigDialogShell>
);
