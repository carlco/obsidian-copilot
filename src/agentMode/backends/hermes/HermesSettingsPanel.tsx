import { EnvOverridesSetting } from "@/agentMode/backends/shared/EnvOverridesSetting";
import type CopilotPlugin from "@/main";
import { useSettingsValue } from "@/settings/model";
import type { App } from "obsidian";
import React from "react";
import { updateHermesFields } from "./descriptor";

interface Props {
  plugin: CopilotPlugin;
  app: App;
}

export const HermesSettingsPanel: React.FC<Props> = () => {
  const settings = useSettingsValue();
  return (
    <EnvOverridesSetting
      backendDisplayName="Hermes"
      value={settings.agentMode?.backends?.hermes?.envOverrides}
      onChange={(next) => updateHermesFields({ envOverrides: next })}
      hintExamples={["HERMES_HOME", "HTTPS_PROXY"]}
    />
  );
};
