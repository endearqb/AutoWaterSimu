import { invoke } from "@tauri-apps/api/core"

export type DesktopJob = {
  job_id: string
  project_id?: string | null
  status: string
  job_type: string
  input_hash?: string | null
  result_hash?: string | null
  worker_version?: string | null
  error_code?: string | null
  error_message?: string | null
  stderr_tail?: string | null
  summary?: unknown
  created_at?: string
  queued_at?: string | null
  started_at?: string | null
  finished_at?: string | null
}

export type DesktopArtifact = {
  artifact_id: string
  job_id: string
  artifact_type: string
  object_key: string
  content_type: string
  size_bytes: number
  checksum: string
  created_at: string
  metadata?: unknown
}

export type DesktopModelRun = {
  schema_version: "model_run.v1"
  model_run_id: string
  job_id: string
  model_key: string
  model_version: string
  parameter_hash: string
  input_hash: string
  quality_metrics: Record<string, unknown>
  warnings: string[]
  evidence_refs: string[]
  metadata?: Record<string, unknown>
}

export type JobSnapshot = {
  job: DesktopJob
  artifacts: DesktopArtifact[]
  model_runs: DesktopModelRun[]
  event_count: number
}

export type JobListResponse = {
  jobs: JobSnapshot[]
  count: number
}

export type DesktopProject = {
  project_id: string
  name: string
  created_at: string
  updated_at: string
}

export type ProjectListResponse = {
  projects: DesktopProject[]
  count: number
}

export type DesktopRecentFile = {
  recent_file_id: string
  file_path: string
  file_type: "project_package"
  last_opened_at: string
}

export type RecentFileListResponse = {
  recent_files: DesktopRecentFile[]
  count: number
}

export type ProjectPackageContentCounts = {
  compute_jobs: number
  job_events?: number
  canvas_graphs: number
  artifact_refs: number
  artifact_files?: number
  support_bundle_refs: number
  support_bundle_files?: number
}

export type ProjectExportResponse = {
  project_id: string
  object_key?: string | null
  exported_path: string
  size_bytes: number
  checksum: string
  content_counts: ProjectPackageContentCounts
  recent_file?: DesktopRecentFile
  target_kind?: "sandbox" | "external_file"
  status: string
}

export type ProjectImportResponse = {
  project: DesktopProject
  object_key?: string | null
  source_path?: string | null
  source_kind?: "sandbox" | "external_file"
  content_counts: ProjectPackageContentCounts
  imported_counts: {
    canvas_graphs: number
    compute_jobs?: number
    artifacts?: number
    model_runs?: number
    job_events?: number
    support_bundles?: number
    artifact_files?: number
    support_bundle_files?: number
  }
  metadata_only_counts: Omit<ProjectPackageContentCounts, "canvas_graphs">
  recent_file?: DesktopRecentFile
  imported_at: string
  status: string
}

export type CanvasGraphRecord = {
  graph_id: string
  project_id?: string | null
  schema_version: "canvas_graph.v1"
  graph: unknown
  created_at: string
  updated_at: string
}

export type ProcessGraphValidationError = {
  code: string
  path: string
  message: string
}

export type ProcessGraphValidationResponse = {
  schema_version: "process_graph_validation.v1"
  process_graph_id?: string | null
  status: "valid" | "invalid"
  errors: ProcessGraphValidationError[]
  warnings: string[]
}

export type WorkerSelfCheckResponse = {
  status: string
  self_check: Record<string, unknown>
  stderr_tail: string
}

export type ArtifactExportResponse = {
  artifact_id: string
  source_object_key: string
  exported_path: string
  status: string
}

export type ArtifactCsvExportResponse = ArtifactExportResponse & {
  format: "csv"
  row_count: number
}

export type SupportBundleResponse = {
  bundle_id: string
  job_id: string
  object_key: string
  size_bytes: number
  checksum: string
  created_at: string
}

export type ProjectBackupResponse = {
  backup_id: string
  object_key: string
  backup_path: string
  size_bytes: number
  file_count: number
  checksum: string
  created_at: string
  status: string
}

export type ProjectRestoreResponse = {
  backup_id: string
  object_key: string
  restored_at: string
  status: string
}

export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in (window as unknown as Record<string, unknown>)
  )
}

async function callDesktop<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauriRuntime()) {
    throw new Error("Tauri runtime unavailable")
  }
  return invoke<T>(command, args)
}

export function workerSelfCheck(): Promise<WorkerSelfCheckResponse> {
  return callDesktop("worker_self_check")
}

export function createProject(name: string): Promise<DesktopProject> {
  return callDesktop("project_create", { name })
}

export function getProject(projectId: string): Promise<DesktopProject> {
  return callDesktop("project_get", { projectId })
}

export function listProjects(): Promise<ProjectListResponse> {
  return callDesktop("project_list")
}

export function listRecentFiles(): Promise<RecentFileListResponse> {
  return callDesktop("recent_file_list")
}

export function exportProject(
  projectId: string,
  targetDir: string,
): Promise<ProjectExportResponse> {
  return callDesktop("project_export", { projectId, targetDir })
}

export function exportProjectFile(
  projectId: string,
  filePath: string,
): Promise<ProjectExportResponse> {
  return callDesktop("project_export_file", { projectId, filePath })
}

export function importProject(
  exportObjectKey: string,
): Promise<ProjectImportResponse> {
  return callDesktop("project_import", { exportObjectKey })
}

export function importProjectFile(
  filePath: string,
): Promise<ProjectImportResponse> {
  return callDesktop("project_import_file", { filePath })
}

export function importRecentProject(
  recentFileId: string,
): Promise<ProjectImportResponse> {
  return callDesktop("project_import_recent", { recentFileId })
}

export function createComputeJob(
  requestJson: string,
  projectId?: string,
): Promise<JobSnapshot> {
  return callDesktop("compute_job_create", { projectId, requestJson })
}

export function runComputeJob(jobId: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_run", { jobId })
}

export function getComputeJob(jobId: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_get", { jobId })
}

export function cancelComputeJob(jobId: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_cancel", { jobId })
}

export function listComputeJobs(): Promise<JobListResponse> {
  return callDesktop("compute_job_list")
}

export function saveCanvasGraph(
  graphJson: string,
  projectId?: string,
): Promise<CanvasGraphRecord> {
  return callDesktop("canvas_graph_save", { graphJson, projectId })
}

export function loadCanvasGraph(graphId: string): Promise<CanvasGraphRecord> {
  return callDesktop("canvas_graph_load", { graphId })
}

export function validateProcessGraph(
  graphJson: string,
): Promise<ProcessGraphValidationResponse> {
  return callDesktop("process_graph_validate", { graphJson })
}

export function exportArtifact(
  artifactId: string,
  targetDir: string,
): Promise<ArtifactExportResponse> {
  return callDesktop("artifact_export", { artifactId, targetDir })
}

export function exportArtifactCsv(
  artifactId: string,
  targetDir: string,
): Promise<ArtifactCsvExportResponse> {
  return callDesktop("artifact_export_csv", { artifactId, targetDir })
}

export function createProjectBackup(): Promise<ProjectBackupResponse> {
  return callDesktop("project_backup")
}

export function restoreProjectBackup(
  backupObjectKey: string,
): Promise<ProjectRestoreResponse> {
  return callDesktop("project_restore", { backupObjectKey })
}

export function createSupportBundle(
  jobId: string,
): Promise<SupportBundleResponse> {
  return callDesktop("support_bundle_create", { jobId })
}
