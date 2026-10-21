import { getSettings } from "@/settings/model";
import type { AcpBackend, AcpSpawnDescriptor } from "@/agentMode/acp/types";
import { buildSimpleSpawnDescriptor } from "@/agentMode/backends/shared/simpleBinaryBackend";
import {
  buildBuiltinSkillEnv,
  sanitizeBuiltinSkillEnvOverrides,
} from "@/agentMode/backends/shared/builtinSkillEnv";

export const HERMES_ACP_SUBCOMMAND = "acp";

export class HermesBackend implements AcpBackend {
  readonly id = "hermes" as const;
  readonly displayName = "Hermes";

  constructor(private readonly clientVersion = "") {}

  async buildSpawnDescriptor(ctx: { vaultBasePath: string }): Promise<AcpSpawnDescriptor> {
    const hermes = getSettings().agentMode?.backends?.hermes;
    const descriptor = buildSimpleSpawnDescriptor(
      hermes?.binaryPath,
      "Hermes path not configured. Open Agent Mode settings and set the path to the hermes CLI.",
      sanitizeBuiltinSkillEnvOverrides(hermes?.envOverrides),
      await buildBuiltinSkillEnv(this.clientVersion, ctx.vaultBasePath)
    );
    return { ...descriptor, args: [HERMES_ACP_SUBCOMMAND] };
  }
}
