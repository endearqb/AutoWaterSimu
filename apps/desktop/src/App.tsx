import { useCallback, useEffect, useMemo, useState } from "react"
import { MATERIAL_BALANCE_MINIMAL_JOB } from "./fixtures/materialBalanceMinimalJob"
import {
  createComputeJob,
  createSupportBundle,
  exportArtifact,
  getComputeJob,
  isTauriRuntime,
  JobSnapshot,
  listComputeJobs,
  runComputeJob,
  workerSelfCheck,
  type ArtifactExportResponse,
  type SupportBundleResponse,
  type WorkerSelfCheckResponse,
} from "./lib/desktopCommands"

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
  const [artifactExport, setArtifactExport] =
    useState<ArtifactExportResponse | null>(null)
  const [supportBundle, setSupportBundle] =
    useState<SupportBundleResponse | null>(null)

  const selectedArtifact = selectedJob?.artifacts[0] ?? null
  const canRunSelected = selectedJob?.job.status === "queued"

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

  useEffect(() => {
    void refreshJobs().catch((error: unknown) => {
      setMessage(errorToMessage(error))
    })
  }, [refreshJobs])

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

  async function handleCreateDemoJob() {
    await runAction("Create demo job", async () => {
      const requestJson = JSON.stringify(MATERIAL_BALANCE_MINIMAL_JOB)
      try {
        const created = await createComputeJob(requestJson)
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

  const summaryText = useMemo(() => {
    if (!selectedJob?.job.summary) {
      return "No summary recorded."
    }
    return JSON.stringify(selectedJob.job.summary, null, 2)
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
                disabled={!runtimeAvailable || busy || !selectedJob}
                onClick={handleSupportBundle}
              >
                Support Bundle
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
              label="Support Bundle"
              value={supportBundle?.object_key ?? "No bundle yet."}
            />
          </div>
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
