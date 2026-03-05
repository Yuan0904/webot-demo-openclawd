import { randomUUID, createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type OfficeVersionStage = "pre" | "post";

export type OfficeVersionEntry = {
  id: string;
  filePath: string;
  snapshotPath: string;
  stage: OfficeVersionStage;
  createdAt: number;
  sizeBytes: number;
  sha256: string;
  prompt?: string;
  parentId?: string;
};

type OfficeVersionManifest = {
  docId: string;
  filePath: string;
  currentVersionId?: string;
  versions: OfficeVersionEntry[];
};

const ALLOWED_EXTENSIONS = new Set([
  ".xlsx",
  ".xlsm",
  ".xls",
  ".csv",
  ".tsv",
  ".docx",
  ".docm",
  ".doc",
  ".pptx",
  ".pptm",
  ".ppt",
]);

function normalizeTargetPath(filePath: string): string {
  return path.resolve(filePath);
}

function toDocId(filePath: string): string {
  return createHash("sha1").update(filePath).digest("hex").slice(0, 16);
}

function resolveStoreRoot() {
  return path.resolve(process.cwd(), ".webbot", "versions");
}

function assertSupportedOfficeFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(`unsupported office file extension: ${ext || "(none)"}`);
  }
}

async function sha256File(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function readManifest(docDir: string, defaultFilePath: string): Promise<OfficeVersionManifest> {
  const manifestPath = path.join(docDir, "manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    const parsed = JSON.parse(raw) as OfficeVersionManifest;
    if (!Array.isArray(parsed.versions)) {
      parsed.versions = [];
    }
    return parsed;
  } catch {
    return {
      docId: toDocId(defaultFilePath),
      filePath: defaultFilePath,
      versions: [],
    };
  }
}

async function writeManifest(docDir: string, manifest: OfficeVersionManifest): Promise<void> {
  await fs.mkdir(docDir, { recursive: true });
  await fs.writeFile(path.join(docDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
}

export async function createOfficeVersionSnapshot(input: {
  filePath: string;
  stage?: OfficeVersionStage;
  prompt?: string;
  parentId?: string;
}) {
  const absFilePath = normalizeTargetPath(input.filePath);
  assertSupportedOfficeFile(absFilePath);
  const stat = await fs.stat(absFilePath);
  if (!stat.isFile()) {
    throw new Error(`file is not a regular file: ${absFilePath}`);
  }

  const docId = toDocId(absFilePath);
  const storeRoot = resolveStoreRoot();
  const docDir = path.join(storeRoot, docId);
  const ext = path.extname(absFilePath) || ".bin";
  const versionId = randomUUID();
  const stage = input.stage ?? "post";
  const createdAt = Date.now();
  const snapshotName = `${createdAt}_${stage}_${versionId}${ext}`;
  const snapshotPath = path.join(docDir, snapshotName);

  await fs.mkdir(docDir, { recursive: true });
  await fs.copyFile(absFilePath, snapshotPath);

  const hash = await sha256File(snapshotPath);
  const snapshotStat = await fs.stat(snapshotPath);

  const manifest = await readManifest(docDir, absFilePath);
  manifest.filePath = absFilePath;

  const entry: OfficeVersionEntry = {
    id: versionId,
    filePath: absFilePath,
    snapshotPath,
    stage,
    createdAt,
    sizeBytes: snapshotStat.size,
    sha256: hash,
    prompt: input.prompt,
    parentId: input.parentId,
  };

  manifest.versions.push(entry);
  if (stage === "post") {
    manifest.currentVersionId = versionId;
  }

  await writeManifest(docDir, manifest);

  return {
    ok: true as const,
    docId,
    currentVersionId: manifest.currentVersionId,
    version: entry,
  };
}

export async function listOfficeVersions(filePath: string, limit = 50) {
  const absFilePath = normalizeTargetPath(filePath);
  assertSupportedOfficeFile(absFilePath);
  const docId = toDocId(absFilePath);
  const docDir = path.join(resolveStoreRoot(), docId);
  const manifest = await readManifest(docDir, absFilePath);
  const versions = [...manifest.versions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, Math.max(1, Math.min(200, Math.trunc(limit) || 50)));

  return {
    ok: true as const,
    docId,
    filePath: absFilePath,
    currentVersionId: manifest.currentVersionId,
    versions,
  };
}

export async function restoreOfficeVersion(input: {
  filePath: string;
  versionId: string;
  markCurrent?: boolean;
}) {
  const absFilePath = normalizeTargetPath(input.filePath);
  assertSupportedOfficeFile(absFilePath);
  const docId = toDocId(absFilePath);
  const docDir = path.join(resolveStoreRoot(), docId);
  const manifest = await readManifest(docDir, absFilePath);
  const target = manifest.versions.find((v) => v.id === input.versionId);
  if (!target) {
    throw new Error(`version not found: ${input.versionId}`);
  }

  await fs.copyFile(target.snapshotPath, absFilePath);
  const restoredHash = await sha256File(absFilePath);

  if (input.markCurrent ?? true) {
    manifest.currentVersionId = target.id;
    await writeManifest(docDir, manifest);
  }

  return {
    ok: true as const,
    docId,
    filePath: absFilePath,
    restoredVersionId: target.id,
    restoredSha256: restoredHash,
  };
}
