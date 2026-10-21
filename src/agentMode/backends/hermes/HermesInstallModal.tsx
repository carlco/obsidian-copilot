import { HermesConfigView } from "@/agentMode/backends/hermes/ui/HermesConfigView";
import { FullBleedReactModal } from "@/components/modals/ReactModal";
import { useSettingsValue } from "@/settings/model";
import { validateExecutableFile } from "@/utils/detectBinary";
import { Notice } from "obsidian";
import React from "react";
import {
  HermesBackendDescriptor,
  detectHermesPath,
  hermesDetectionSearchDirs,
  updateHermesFields,
} from "./descriptor";

const HermesConfigContainer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const settings = useSettingsValue();

  const onSavePath = React.useCallback(async (path: string): Promise<string | null> => {
    const err = await validateExecutableFile(path);
    if (err) return err;
    updateHermesFields({ binaryPath: path });
    new Notice("Hermes CLI path saved.");
    return null;
  }, []);

  const onClearPath = React.useCallback((): void => {
    updateHermesFields({ binaryPath: undefined });
  }, []);

  return (
    <HermesConfigView
      state={HermesBackendDescriptor.getInstallState(settings)}
      binaryPath={settings.agentMode?.backends?.hermes?.binaryPath ?? ""}
      onSavePath={onSavePath}
      onClearPath={onClearPath}
      detect={detectHermesPath}
      searchedDirs={hermesDetectionSearchDirs}
      onClose={onClose}
    />
  );
};

export class HermesInstallModal extends FullBleedReactModal {
  protected renderContent(close: () => void): React.ReactElement {
    return <HermesConfigContainer onClose={close} />;
  }
}
