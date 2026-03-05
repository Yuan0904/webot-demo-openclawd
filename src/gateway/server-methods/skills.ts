import type { WebBotConfig } from "../../config/config.js";
import type { GatewayRequestHandlers } from "./types.js";
import {
  listAgentIds,
  resolveAgentWorkspaceDir,
  resolveDefaultAgentId,
} from "../../agents/agent-scope.js";
import { installSkill } from "../../agents/skills-install.js";
import { buildWorkspaceSkillStatus } from "../../agents/skills-status.js";
import { loadWorkspaceSkillEntries, type SkillEntry } from "../../agents/skills.js";
import { loadConfig, writeConfigFile } from "../../config/config.js";
import { getRemoteSkillEligibility } from "../../infra/skills-remote.js";
import { normalizeAgentId } from "../../routing/session-key.js";
import { normalizeSecretInput } from "../../utils/normalize-secret-input.js";
import {
  createOfficeVersionSnapshot,
  listOfficeVersions,
  restoreOfficeVersion,
} from "../../skills/office-versioning.js";
import {
  ErrorCodes,
  errorShape,
  formatValidationErrors,
  validateSkillsBinsParams,
  validateSkillsInstallParams,
  validateSkillsOfficeVersionCreateParams,
  validateSkillsOfficeVersionListParams,
  validateSkillsOfficeVersionRestoreParams,
  validateSkillsStatusParams,
  validateSkillsUpdateParams,
  validateSkillsXlsxVersionCreateParams,
  validateSkillsXlsxVersionListParams,
  validateSkillsXlsxVersionRestoreParams,
} from "../protocol/index.js";

function listWorkspaceDirs(cfg: WebBotConfig): string[] {
  const dirs = new Set<string>();
  const list = cfg.agents?.list;
  if (Array.isArray(list)) {
    for (const entry of list) {
      if (entry && typeof entry === "object" && typeof entry.id === "string") {
        dirs.add(resolveAgentWorkspaceDir(cfg, entry.id));
      }
    }
  }
  dirs.add(resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg)));
  return [...dirs];
}

function collectSkillBins(entries: SkillEntry[]): string[] {
  const bins = new Set<string>();
  for (const entry of entries) {
    const required = entry.metadata?.requires?.bins ?? [];
    const anyBins = entry.metadata?.requires?.anyBins ?? [];
    const install = entry.metadata?.install ?? [];
    for (const bin of required) {
      const trimmed = bin.trim();
      if (trimmed) {
        bins.add(trimmed);
      }
    }
    for (const bin of anyBins) {
      const trimmed = bin.trim();
      if (trimmed) {
        bins.add(trimmed);
      }
    }
    for (const spec of install) {
      const specBins = spec?.bins ?? [];
      for (const bin of specBins) {
        const trimmed = String(bin).trim();
        if (trimmed) {
          bins.add(trimmed);
        }
      }
    }
  }
  return [...bins].toSorted();
}

export const skillsHandlers: GatewayRequestHandlers = {
  "skills.status": ({ params, respond }) => {
    if (!validateSkillsStatusParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.status params: ${formatValidationErrors(validateSkillsStatusParams.errors)}`,
        ),
      );
      return;
    }
    const cfg = loadConfig();
    const agentIdRaw = typeof params?.agentId === "string" ? params.agentId.trim() : "";
    const agentId = agentIdRaw ? normalizeAgentId(agentIdRaw) : resolveDefaultAgentId(cfg);
    if (agentIdRaw) {
      const knownAgents = listAgentIds(cfg);
      if (!knownAgents.includes(agentId)) {
        respond(
          false,
          undefined,
          errorShape(ErrorCodes.INVALID_REQUEST, `unknown agent id "${agentIdRaw}"`),
        );
        return;
      }
    }
    const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
    const report = buildWorkspaceSkillStatus(workspaceDir, {
      config: cfg,
      eligibility: { remote: getRemoteSkillEligibility() },
    });
    respond(true, report, undefined);
  },
  "skills.bins": ({ params, respond }) => {
    if (!validateSkillsBinsParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.bins params: ${formatValidationErrors(validateSkillsBinsParams.errors)}`,
        ),
      );
      return;
    }
    const cfg = loadConfig();
    const workspaceDirs = listWorkspaceDirs(cfg);
    const bins = new Set<string>();
    for (const workspaceDir of workspaceDirs) {
      const entries = loadWorkspaceSkillEntries(workspaceDir, { config: cfg });
      for (const bin of collectSkillBins(entries)) {
        bins.add(bin);
      }
    }
    respond(true, { bins: [...bins].toSorted() }, undefined);
  },
  "skills.install": async ({ params, respond }) => {
    if (!validateSkillsInstallParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.install params: ${formatValidationErrors(validateSkillsInstallParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as {
      name: string;
      installId: string;
      timeoutMs?: number;
    };
    const cfg = loadConfig();
    const workspaceDirRaw = resolveAgentWorkspaceDir(cfg, resolveDefaultAgentId(cfg));
    const result = await installSkill({
      workspaceDir: workspaceDirRaw,
      skillName: p.name,
      installId: p.installId,
      timeoutMs: p.timeoutMs,
      config: cfg,
    });
    respond(
      result.ok,
      result,
      result.ok ? undefined : errorShape(ErrorCodes.UNAVAILABLE, result.message),
    );
  },
  "skills.update": async ({ params, respond }) => {
    if (!validateSkillsUpdateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.update params: ${formatValidationErrors(validateSkillsUpdateParams.errors)}`,
        ),
      );
      return;
    }
    const p = params as {
      skillKey: string;
      enabled?: boolean;
      apiKey?: string;
      env?: Record<string, string>;
    };
    const cfg = loadConfig();
    const skills = cfg.skills ? { ...cfg.skills } : {};
    const entries = skills.entries ? { ...skills.entries } : {};
    const current = entries[p.skillKey] ? { ...entries[p.skillKey] } : {};
    if (typeof p.enabled === "boolean") {
      current.enabled = p.enabled;
    }
    if (typeof p.apiKey === "string") {
      const trimmed = normalizeSecretInput(p.apiKey);
      if (trimmed) {
        current.apiKey = trimmed;
      } else {
        delete current.apiKey;
      }
    }
    if (p.env && typeof p.env === "object") {
      const nextEnv = current.env ? { ...current.env } : {};
      for (const [key, value] of Object.entries(p.env)) {
        const trimmedKey = key.trim();
        if (!trimmedKey) {
          continue;
        }
        const trimmedVal = value.trim();
        if (!trimmedVal) {
          delete nextEnv[trimmedKey];
        } else {
          nextEnv[trimmedKey] = trimmedVal;
        }
      }
      current.env = nextEnv;
    }
    entries[p.skillKey] = current;
    skills.entries = entries;
    const nextConfig: WebBotConfig = {
      ...cfg,
      skills,
    };
    await writeConfigFile(nextConfig);
    respond(true, { ok: true, skillKey: p.skillKey, config: current }, undefined);
  },
  "skills.office.version.create": async ({ params, respond }) => {
    if (!validateSkillsOfficeVersionCreateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.office.version.create params: ${formatValidationErrors(validateSkillsOfficeVersionCreateParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as {
        filePath: string;
        versionType?: "before_ai" | "after_ai";
        taskId?: string;
        createdBy?: "ai" | "system";
      };
      const result = await createOfficeVersionSnapshot({
        filePath: p.filePath,
        stage: p.versionType === "before_ai" ? "pre" : "post",
        parentId: p.taskId,
        prompt: p.createdBy,
      });
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "skills.office.version.list": async ({ params, respond }) => {
    if (!validateSkillsOfficeVersionListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.office.version.list params: ${formatValidationErrors(validateSkillsOfficeVersionListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as { filePath: string; limit?: number };
      const result = await listOfficeVersions(p.filePath, p.limit ?? 50);
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "skills.office.version.restore": async ({ params, respond }) => {
    if (!validateSkillsOfficeVersionRestoreParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.office.version.restore params: ${formatValidationErrors(validateSkillsOfficeVersionRestoreParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as { filePath: string; versionId: string; markCurrent?: boolean };
      const result = await restoreOfficeVersion({
        filePath: p.filePath,
        versionId: p.versionId,
        markCurrent: p.markCurrent,
      });
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  // Backward-compatible aliases
  "skills.xlsx.version.create": async ({ params, respond }) => {
    if (!validateSkillsXlsxVersionCreateParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.xlsx.version.create params: ${formatValidationErrors(validateSkillsXlsxVersionCreateParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as {
        filePath: string;
        versionType?: "before_ai" | "after_ai";
        taskId?: string;
        createdBy?: "ai" | "system";
      };
      const result = await createOfficeVersionSnapshot({
        filePath: p.filePath,
        stage: p.versionType === "before_ai" ? "pre" : "post",
        parentId: p.taskId,
        prompt: p.createdBy,
      });
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "skills.xlsx.version.list": async ({ params, respond }) => {
    if (!validateSkillsXlsxVersionListParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.xlsx.version.list params: ${formatValidationErrors(validateSkillsXlsxVersionListParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as { filePath: string; limit?: number };
      const result = await listOfficeVersions(p.filePath, p.limit ?? 50);
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
  "skills.xlsx.version.restore": async ({ params, respond }) => {
    if (!validateSkillsXlsxVersionRestoreParams(params)) {
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.INVALID_REQUEST,
          `invalid skills.xlsx.version.restore params: ${formatValidationErrors(validateSkillsXlsxVersionRestoreParams.errors)}`,
        ),
      );
      return;
    }
    try {
      const p = params as { filePath: string; versionId: string; markCurrent?: boolean };
      const result = await restoreOfficeVersion({
        filePath: p.filePath,
        versionId: p.versionId,
        markCurrent: p.markCurrent,
      });
      respond(true, result, undefined);
    } catch (err) {
      respond(false, undefined, errorShape(ErrorCodes.UNAVAILABLE, String(err)));
    }
  },
};
