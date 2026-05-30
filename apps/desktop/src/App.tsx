import { useCallback, useEffect, useMemo, useState } from "react"
import {
  MATERIAL_BALANCE_CANVAS_GRAPH,
  MATERIAL_BALANCE_PROCESS_GRAPH,
} from "./fixtures/materialBalanceGraphFixtures"
import { MATERIAL_BALANCE_MINIMAL_JOB } from "./fixtures/materialBalanceMinimalJob"
import {
  cancelComputeJob,
  createComputeJob,
  createProject,
  createProjectBackup,
  createSupportBundle,
  exportArtifact,
  exportArtifactCsv,
  exportProject,
  exportProjectFile,
  getComputeJob,
  getProject,
  importProject,
  importProjectFile,
  importRecentProject,
  isTauriRuntime,
  loadCanvasGraph,
  listComputeJobs,
  listProjects,
  listRecentFiles,
  restoreProjectBackup,
  runComputeJob,
  saveCanvasGraph,
  validateProcessGraph,
  workerSelfCheck,
  type ArtifactCsvExportResponse,
  type ArtifactExportResponse,
  type CanvasGraphRecord,
  type DesktopProject,
  type DesktopRecentFile,
  type JobSnapshot,
  type ProcessGraphValidationResponse,
  type ProjectBackupResponse,
  type ProjectExportResponse,
  type ProjectImportResponse,
  type ProjectPackageContentCounts,
  type ProjectRestoreResponse,
  type SupportBundleResponse,
  type WorkerSelfCheckResponse,
} from "./lib/desktopCommands"
import {
  chooseProjectExportPath,
  chooseProjectImportPath,
} from "./lib/projectDialogs"

type ActionState = "idle" | "running"

const DEMO_JOB_ID = MATERIAL_BALANCE_MINIMAL_JOB.job_id
const EXPORT_TARGET = "manual/job_material_balance_minimal"

export function App() {
  const [runtimeAvailable] = useState(isTauriRuntime)
  const [actionState, setActionState] = useState<ActionState>("idle")
  const [message, setMessage] = useState("Desktop runtime is ready for checks.")
  const [workerStatus, setWorkerStatus] =
    useState<WorkerSelfCheckResponse | null>(null)
  const [jobs, setJobs] = useState<JobSnapshot[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>(DEMO_JOB_ID)
  const [selectedJob, setSelectedJob] = useState<JobSnapshot | null>(null)
  const [projects, setProjects] = useState<DesktopProject[]>([])
  const [recentFiles, setRecentFiles] = useState<DesktopRecentFile[]>([])
  const [selectedProject, setSelectedProject] = useState<DesktopProject | null>(
    null,
  )
  const [projectExport, setProjectExport] =
    useState<ProjectExportResponse | null>(null)
  const [projectImport, setProjectImport] =
    useState<ProjectImportResponse | null>(null)
  const [artifactExport, setArtifactExport] =
    useState<ArtifactExportResponse | null>(null)
  const [artifactCsvExport, setArtifactCsvExport] =
    useState<ArtifactCsvExportResponse | null>(null)
  const [supportBundle, setSupportBundle] =
    useState<SupportBundleResponse | null>(null)
  const [projectBackup, setProjectBackup] =
    useState<ProjectBackupResponse | null>(null)
  const [projectRestore, setProjectRestore] =
    useState<ProjectRestoreResponse | null>(null)
  const [canvasGraph, setCanvasGraph] = useState<CanvasGraphRecord | null>(null)
  const [loadedCanvasGraph, setLoadedCanvasGraph] =
    useState<CanvasGraphRecord | null>(null)
  const [processValidation, setProcessValidation] =
    useState<ProcessGraphValidationResponse | null>(null)

  const selectedArtifact = selectedJob?.artifacts[0] ?? null
  const canRunSelected = selectedJob?.job.status === "queued"
  const canLoadCanvasGraph = Boolean(canvasGraph?.graph_id)

  const busy = actionState === "running"

  const refreshJobs = useCallback(async () => {
    if (!runtimeAvailable) {
      return
    }
    const response = await listComputeJobs()
    setJobs(response.jobs)
    const match = response.jobs.find((item) => item.job.job_id === selectedJobId)
    setSelectedJob(match ?? response.jobs[0] ?? null)
    if (!match && response.jobs[0]) {
      setSelectedJobId(response.jobs[0].job.job_id)
    }
  }, [runtimeAvailable, selectedJobId])

  const refreshProjects = useCallback(async () => {
    if (!runtimeAvailable) {
      return
    }
    const response = await listProjects()
    setProjects(response.projects)
    setSelectedProject((current) => {
      if (!current) {
        return response.projects[0] ?? null
      }
      return (
        response.projects.find(
          (item) => item.project_id === current.project_id,
        ) ??
        response.projects[0] ??
        null
      )
    })
  }, [runtimeAvailable])

  const refreshRecentFiles = useCallback(async () => {
    if (!runtimeAvailable) {
      return
    }
    const response = await listRecentFiles()
    setRecentFiles(response.recent_files)
  }, [runtimeAvailable])

  useEffect(() => {
    void refreshJobs().catch((error: unknown) => {
      setMessage(errorToMessage(error))
    })
  }, [refreshJobs])

  useEffect(() => {
    void refreshProjects().catch((error: unknown) => {
      setMessage(errorToMessage(error))
    })
  }, [refreshProjects])

  useEffect(() => {
    void refreshRecentFiles().catch((error: unknown) => {
      setMessage(errorToMessage(error))
    })
  }, [refreshRecentFiles])

  async function runAction(
    label: string,
    action: () => Promise<void>,
  ): Promise<void> {
    setActionState("running")
    setMessage(`${label}...`)
    try {
      await action()
      setMessage(`${label} completed.`)
    } catch (error) {
      setMessage(errorToMessage(error))
    } finally {
      setActionState("idle")
    }
  }

  async function handleSelfCheck() {
    await runAction("Worker self-check", async () => {
      const result = await workerSelfCheck()
      setWorkerStatus(result)
    })
  }

  async function handleCreateProject() {
    await runAction("Create project", async () => {
      const result = await createProject("Desktop Smoke Project")
      setSelectedProject(result)
      await refreshProjects()
    })
  }

  async function handleReloadProject() {
    if (!selectedProject?.project_id) {
      return
    }
    await runAction("Load project", async () => {
      const result = await getProject(selectedProject.project_id)
      setSelectedProject(result)
      await refreshProjects()
    })
  }

  async function handleExportProject() {
    if (!selectedProject?.project_id) {
      return
    }
    await runAction("Export project", async () => {
      const result = await exportProject(selectedProject.project_id, "projects")
      setProjectExport(result)
      setProjectImport(null)
    })
  }

  async function handleExportProjectFile() {
    if (!selectedProject?.project_id) {
      return
    }
    const filePath = await chooseProjectExportPath(selectedProject.project_id)
    if (!filePath) {
      return
    }
    await runAction("Export project file", async () => {
      const result = await exportProjectFile(selectedProject.project_id, filePath)
      setProjectExport(result)
      setProjectImport(null)
      await refreshRecentFiles()
    })
  }

  async function handleImportProject() {
    const objectKey = projectExport?.object_key
    if (!objectKey) {
      return
    }
    await runAction("Import project", async () => {
      const result = await importProject(objectKey)
      setProjectImport(result)
      setSelectedProject(result.project)
      await refreshProjects()
    })
  }

  async function handleImportProjectFile() {
    const filePath = await chooseProjectImportPath()
    if (!filePath) {
      return
    }
    await runAction("Import project file", async () => {
      const result = await importProjectFile(filePath)
      setProjectImport(result)
      setSelectedProject(result.project)
      await refreshProjects()
      await refreshRecentFiles()
    })
  }

  async function handleImportRecentProject() {
    const recentFileId = recentFiles[0]?.recent_file_id
    if (!recentFileId) {
      return
    }
    await runAction("Import recent project file", async () => {
      const result = await importRecentProject(recentFileId)
      setProjectImport(result)
      setSelectedProject(result.project)
      await refreshProjects()
      await refreshRecentFiles()
    })
  }

  async function handleCreateDemoJob() {
    await runAction("Create demo job", async () => {
      const requestJson = JSON.stringify(MATERIAL_BALANCE_MINIMAL_JOB)
      try {
        const created = await createComputeJob(
          requestJson,
          selectedProject?.project_id,
        )
        setSelectedJobId(created.job.job_id)
        setSelectedJob(created)
      } catch (error) {
        const messageText = errorToMessage(error)
        if (!messageText.includes("compute_job already exists")) {
          throw error
        }
        const existing = await getComputeJob(DEMO_JOB_ID)
        setSelectedJobId(existing.job.job_id)
        setSelectedJob(existing)
      }
      await refreshJobs()
    })
  }

  async function handleRunJob() {
    if (!selectedJobId) {
      return
    }
    await runAction("Run selected job", async () => {
      const result = await runComputeJob(selectedJobId)
      setSelectedJob(result)
      await refreshJobs()
    })
  }

  async function handleCancelJob() {
    if (!selectedJobId) {
      return
    }
    await runAction("Cancel selected job", async () => {
      const result = await cancelComputeJob(selectedJobId)
      setSelectedJob(result)
      await refreshJobs()
    })
  }

  async function handleSelectJob(jobId: string) {
    setSelectedJobId(jobId)
    await runAction("Load job", async () => {
      const result = await getComputeJob(jobId)
      setSelectedJob(result)
    })
  }

  async function handleExportArtifact() {
    if (!selectedArtifact) {
      return
    }
    await runAction("Export artifact", async () => {
      const result = await exportArtifact(
        selectedArtifact.artifact_id,
        EXPORT_TARGET,
      )
      setArtifactExport(result)
    })
  }

  async function handleExportArtifactCsv() {
    if (!selectedArtifact) {
      return
    }
    await runAction("Export CSV", async () => {
      const result = await exportArtifactCsv(
        selectedArtifact.artifact_id,
        EXPORT_TARGET,
      )
      setArtifactCsvExport(result)
    })
  }

  async function handleSupportBundle() {
    if (!selectedJobId) {
      return
    }
    await runAction("Create support bundle", async () => {
      const result = await createSupportBundle(selectedJobId)
      setSupportBundle(result)
      await refreshJobs()
    })
  }

  async function handleProjectBackup() {
    await runAction("Create backup", async () => {
      const result = await createProjectBackup()
      setProjectBackup(result)
      setProjectRestore(null)
    })
  }

  async function handleProjectRestore() {
    if (!projectBackup?.object_key) {
      return
    }
    await runAction("Restore backup", async () => {
      const result = await restoreProjectBackup(projectBackup.object_key)
      setProjectRestore(result)
      await refreshJobs()
    })
  }

  async function handleSaveCanvasGraph() {
    await runAction("Save canvas graph", async () => {
      const result = await saveCanvasGraph(
        JSON.stringify(MATERIAL_BALANCE_CANVAS_GRAPH),
        selectedProject?.project_id,
      )
      setCanvasGraph(result)
      setLoadedCanvasGraph(null)
    })
  }

  async function handleLoadCanvasGraph() {
    if (!canvasGraph?.graph_id) {
      return
    }
    await runAction("Load canvas graph", async () => {
      const result = await loadCanvasGraph(canvasGraph.graph_id)
      setLoadedCanvasGraph(result)
    })
  }

  async function handleValidateProcessGraph() {
    await runAction("Validate process graph", async () => {
      const result = await validateProcessGraph(
        JSON.stringify(MATERIAL_BALANCE_PROCESS_GRAPH),
      )
      setProcessValidation(result)
    })
  }

  const summaryText = useMemo(() => {
    if (!selectedJob?.job.summary) {
      return "No summary recorded."
    }
    return JSON.stringify(selectedJob.job.summary, null, 2)
  }, [selectedJob])

  const modelRunsText = useMemo(() => {
    const modelRuns = selectedJob?.model_runs ?? []
    if (modelRuns.length === 0) {
      return "No model run recorded."
    }
    return JSON.stringify(modelRuns, null, 2)
  }, [selectedJob])

  return (
    <main className="app-shell">
      <section className="sidebar" aria-label="Desktop job controls">
        <div>
          <p className="eyebrow">AutoWaterSimu Next</p>
          <h1>Desktop Runtime</h1>
        </div>

        <RuntimeNotice available={runtimeAvailable} />

        <div className="control-stack">
          <button disabled={!runtimeAvailable || busy} onClick={handleSelfCheck}>
            Worker Self-Check
          </button>
          <button
            disabled={!runtimeAvailable || busy}
            onClick={handleCreateProject}
          >
            Create Project
          </button>
          <button
            disabled={!runtimeAvailable || busy || !selectedProject}
            onClick={handleReloadProject}
          >
            Load Project
          </button>
          <button
            disabled={!runtimeAvailable || busy || !selectedProject}
            onClick={handleExportProject}
          >
            Export Project
          </button>
          <button
            disabled={!runtimeAvailable || busy || !selectedProject}
            onClick={handleExportProjectFile}
          >
            Export Project File
          </button>
          <button
            disabled={!runtimeAvailable || busy || !projectExport?.object_key}
            onClick={handleImportProject}
          >
            Import Project
          </button>
          <button
            disabled={!runtimeAvailable || busy}
            onClick={handleImportProjectFile}
          >
            Import Project File
          </button>
          <button
            disabled={!runtimeAvailable || busy || recentFiles.length === 0}
            onClick={handleImportRecentProject}
          >
            Import Recent Project
          </button>
          <button
            disabled={!runtimeAvailable || busy}
            onClick={handleCreateDemoJob}
          >
            Create Demo Job
          </button>
          <button
            disabled={!runtimeAvailable || busy || !canRunSelected}
            onClick={handleRunJob}
          >
            Run Selected Job
          </button>
          <button
            disabled={!runtimeAvailable || busy || !canRunSelected}
            onClick={handleCancelJob}
          >
            Cancel Queued Job
          </button>
          <button
            disabled={!runtimeAvailable || busy}
            onClick={handleSaveCanvasGraph}
          >
            Save Canvas Graph
          </button>
          <button
            disabled={!runtimeAvailable || busy || !canLoadCanvasGraph}
            onClick={handleLoadCanvasGraph}
          >
            Load Canvas Graph
          </button>
          <button
            disabled={!runtimeAvailable || busy}
            onClick={handleValidateProcessGraph}
          >
            Validate ProcessGraph
          </button>
        </div>

        <div className="status-strip" data-state={busy ? "busy" : "idle"}>
          {message}
        </div>
      </section>

      <section className="workspace" aria-label="Desktop runtime workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Local Queue</p>
            <h2>Material Balance Smoke</h2>
          </div>
          <button disabled={!runtimeAvailable || busy} onClick={refreshJobs}>
            Refresh
          </button>
        </header>

        <div className="grid two">
          <section className="panel">
            <div className="panel-header">
              <h3>Jobs</h3>
              <span>{jobs.length}</span>
            </div>
            <div className="job-list">
              {jobs.length === 0 ? (
                <p className="muted">No local jobs yet.</p>
              ) : (
                jobs.map((item) => (
                  <button
                    className="job-row"
                    data-selected={item.job.job_id === selectedJobId}
                    key={item.job.job_id}
                    onClick={() => void handleSelectJob(item.job.job_id)}
                    type="button"
                  >
                    <span>{item.job.job_id}</span>
                    <StatusPill status={item.job.status} />
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Worker</h3>
              <StatusPill status={workerStatus?.status ?? "unchecked"} />
            </div>
            <pre className="code-block">
              {workerStatus
                ? JSON.stringify(workerStatus.self_check, null, 2)
                : "Run self-check to inspect worker capabilities."}
            </pre>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Projects</h3>
              <span>{projects.length}</span>
            </div>
            <div className="job-list">
              {projects.length === 0 ? (
                <p className="muted">No local projects yet.</p>
              ) : (
                projects.map((project) => (
                  <button
                    className="job-row"
                    data-selected={
                      project.project_id === selectedProject?.project_id
                    }
                    key={project.project_id}
                    onClick={() => setSelectedProject(project)}
                    type="button"
                  >
                    <span>{project.name}</span>
                    <span className="project-id">{project.project_id}</span>
                  </button>
                ))
              )}
            </div>
            <div className="artifact-grid compact">
              <InfoBlock
                label="Project Export"
                value={formatProjectExport(projectExport)}
              />
              <InfoBlock
                label="Project Import"
                value={formatProjectImport(projectImport)}
              />
              <InfoBlock
                label="Recent Project File"
                value={formatRecentProjectFile(recentFiles)}
              />
            </div>
          </section>
        </div>

        <div className="grid two detail-grid">
          <section className="panel">
            <div className="panel-header">
              <h3>Job Detail</h3>
              {selectedJob ? <StatusPill status={selectedJob.job.status} /> : null}
            </div>
            {selectedJob ? (
              <dl className="detail-list">
                <div>
                  <dt>Job ID</dt>
                  <dd>{selectedJob.job.job_id}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{selectedJob.job.job_type}</dd>
                </div>
                <div>
                  <dt>Project</dt>
                  <dd>{selectedJob.job.project_id ?? "none"}</dd>
                </div>
                <div>
                  <dt>Events</dt>
                  <dd>{selectedJob.event_count}</dd>
                </div>
                <div>
                  <dt>Result Hash</dt>
                  <dd>{selectedJob.job.result_hash ?? "pending"}</dd>
                </div>
                <div>
                  <dt>Error</dt>
                  <dd>{selectedJob.job.error_message ?? "none"}</dd>
                </div>
              </dl>
            ) : (
              <p className="muted">Select or create a job.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Summary</h3>
              <span>{selectedJob?.artifacts.length ?? 0} artifacts</span>
            </div>
            <pre className="code-block">{summaryText}</pre>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <h3>Artifacts & Support</h3>
            <div className="inline-actions">
              <button
                disabled={!runtimeAvailable || busy || !selectedArtifact}
                onClick={handleExportArtifact}
              >
                Export Artifact
              </button>
              <button
                disabled={!runtimeAvailable || busy || !selectedArtifact}
                onClick={handleExportArtifactCsv}
              >
                Export CSV
              </button>
              <button
                disabled={!runtimeAvailable || busy || !selectedJob}
                onClick={handleSupportBundle}
              >
                Support Bundle
              </button>
              <button
                disabled={!runtimeAvailable || busy}
                onClick={handleProjectBackup}
              >
                Backup
              </button>
              <button
                disabled={!runtimeAvailable || busy || !projectBackup}
                onClick={handleProjectRestore}
              >
                Restore
              </button>
            </div>
          </div>
          <div className="artifact-grid">
            <InfoBlock
              label="Artifact"
              value={
                selectedArtifact
                  ? `${selectedArtifact.object_key} (${selectedArtifact.size_bytes} bytes)`
                  : "No artifact available."
              }
            />
            <InfoBlock
              label="Export"
              value={artifactExport?.exported_path ?? "No export yet."}
            />
            <InfoBlock
              label="CSV"
              value={
                artifactCsvExport
                  ? `${artifactCsvExport.exported_path} (${artifactCsvExport.row_count} rows)`
                  : "No CSV export yet."
              }
            />
            <InfoBlock
              label="Support Bundle"
              value={supportBundle?.object_key ?? "No bundle yet."}
            />
            <InfoBlock
              label="Backup"
              value={
                projectBackup
                  ? `${projectBackup.object_key} (${projectBackup.file_count} files)`
                  : "No backup yet."
              }
            />
            <InfoBlock
              label="Restore"
              value={projectRestore?.restored_at ?? "No restore yet."}
            />
            <InfoBlock
              label="Canvas Graph"
              value={
                loadedCanvasGraph
                  ? `${loadedCanvasGraph.graph_id} loaded`
                  : canvasGraph
                    ? `${canvasGraph.graph_id} saved`
                    : "No canvas graph saved."
              }
            />
            <InfoBlock
              label="ProcessGraph"
              value={
                processValidation
                  ? `${processValidation.status} (${processValidation.errors.length} errors)`
                  : "No validation yet."
              }
            />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Model Runs</h3>
            <span>{selectedJob?.model_runs.length ?? 0}</span>
          </div>
          <pre className="code-block">{modelRunsText}</pre>
        </section>
      </section>
    </main>
  )
}

function RuntimeNotice(props: { available: boolean }) {
  return (
    <div className="runtime-notice" data-available={props.available}>
      <strong>{props.available ? "Tauri runtime connected" : "Tauri runtime unavailable"}</strong>
      <span>
        {props.available
          ? "Commands are routed through Rust."
          : "Open with Tauri to run local jobs."}
      </span>
    </div>
  )
}

function StatusPill(props: { status: string }) {
  return (
    <span className="status-pill" data-status={props.status}>
      {props.status}
    </span>
  )
}

function formatProjectExport(result: ProjectExportResponse | null): string {
  if (!result) {
    return "No project export yet."
  }
  const location = result.object_key ?? result.exported_path
  return `${location} (${formatProjectPackageCounts(
    result.content_counts,
  )})`
}

function formatProjectImport(result: ProjectImportResponse | null): string {
  if (!result) {
    return "No project import yet."
  }
  const restored = [
    `${result.imported_counts.canvas_graphs} graphs`,
    `${result.imported_counts.compute_jobs ?? 0} jobs`,
    `${result.imported_counts.artifacts ?? 0} artifacts`,
    `${result.imported_counts.support_bundles ?? 0} support bundles`,
  ].join(", ")
  const metadataOnly = formatProjectPackageCounts(result.metadata_only_counts)
  return `${result.project.name} imported (${restored} restored, ${metadataOnly} metadata-only)`
}

function formatRecentProjectFile(files: DesktopRecentFile[]): string {
  const recent = files[0]
  if (!recent) {
    return "No recent project files yet."
  }
  return `${recent.file_path} (${recent.last_opened_at})`
}

function formatProjectPackageCounts(
  counts:
    | ProjectPackageContentCounts
    | Omit<ProjectPackageContentCounts, "canvas_graphs">,
): string {
  const parts = [`${counts.compute_jobs} jobs`]
  if ("canvas_graphs" in counts) {
    parts.push(`${counts.canvas_graphs} graphs`)
  }
  parts.push(
    `${counts.artifact_refs} artifacts`,
    `${counts.support_bundle_refs} support bundles`,
  )
  if ((counts.artifact_files ?? 0) > 0) {
    parts.push(`${counts.artifact_files} artifact files`)
  }
  if ((counts.support_bundle_files ?? 0) > 0) {
    parts.push(`${counts.support_bundle_files} support files`)
  }
  if ((counts.job_events ?? 0) > 0) {
    parts.push(`${counts.job_events} events`)
  }
  return parts.join(", ")
}

function InfoBlock(props: { label: string; value: string }) {
  return (
    <div className="info-block">
      <span>{props.label}</span>
      <p>{props.value}</p>
    </div>
  )
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
