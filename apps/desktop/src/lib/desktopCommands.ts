import { invoke } from "@tauri-apps/api/core"

export type DesktopJob = {
  job_id: string
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

export type JobSnapshot = {
  job: DesktopJob
  artifacts: DesktopArtifact[]
  event_count: number
}

export type JobListResponse = {
  jobs: JobSnapshot[]
  count: number
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

export type SupportBundleResponse = {
  bundle_id: string
  job_id: string
  object_key: string
  size_bytes: number
  checksum: string
  created_at: string
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

export function createComputeJob(requestJson: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_create", { requestJson })
}

export function runComputeJob(jobId: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_run", { jobId })
}

export function getComputeJob(jobId: string): Promise<JobSnapshot> {
  return callDesktop("compute_job_get", { jobId })
}

export function listComputeJobs(): Promise<JobListResponse> {
  return callDesktop("compute_job_list")
}

export function exportArtifact(
  artifactId: string,
  targetDir: string,
): Promise<ArtifactExportResponse> {
  return callDesktop("artifact_export", { artifactId, targetDir })
}

export function createSupportBundle(
  jobId: string,
): Promise<SupportBundleResponse> {
  return callDesktop("support_bundle_create", { jobId })
}
