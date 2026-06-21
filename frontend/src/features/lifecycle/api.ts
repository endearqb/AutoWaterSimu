import { DefaultService } from "@/client/compute"
import type {
  ArtifactRecord,
  ArtifactRetentionSweepReport,
  ArtifactRetentionSweepRequest,
  EvidencePackage,
} from "@/client/compute"
import {
  computeApiPath,
  resolveComputeApiToken,
} from "@/shared/api/computeApiClient"
import type { EvidenceDownloadResult } from "@/shared/api/computeTypes"

export type { ArtifactRecord } from "@/client/compute"

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const readErrorBody = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) {
    return { message: response.statusText || "Request failed" }
  }
  try {
    return JSON.parse(text)
  } catch {
    return { message: text }
  }
}

export const computeArtifactsApi = {
  sweepArtifactRetention(
    request: ArtifactRetentionSweepRequest = { dry_run: true },
  ): Promise<ArtifactRetentionSweepReport> {
    return DefaultService.sweepArtifactRetention({ requestBody: request })
  },

  async downloadArtifact(artifact: ArtifactRecord): Promise<void> {
    const blob = await DefaultService.downloadArtifact({
      artifactId: artifact.artifact_id,
    })
    const objectName =
      artifact.object_key.split("/").pop() || artifact.artifact_id
    downloadBlob(blob, objectName)
  },

  async readArtifactJson<T = unknown>(artifact: ArtifactRecord): Promise<T> {
    const token = await resolveComputeApiToken({ method: "GET", url: "" })
    const response = await fetch(
      computeApiPath(`/api/v1/artifacts/${encodeURIComponent(artifact.artifact_id)}`),
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    )
    if (!response.ok) {
      const body = await readErrorBody(response)
      throw Object.assign(new Error("Artifact read failed"), {
        body,
        status: response.status,
      })
    }
    return (await response.json()) as T
  },

  async downloadEvidencePackage(
    jobId: string,
  ): Promise<EvidenceDownloadResult> {
    const token = await resolveComputeApiToken({ method: "GET", url: "" })
    const response = await fetch(
      computeApiPath(
        `/api/v1/compute/jobs/${encodeURIComponent(jobId)}/evidence`,
      ),
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    )
    if (!response.ok) {
      const body = await readErrorBody(response)
      throw Object.assign(new Error("Evidence download failed"), {
        body,
        status: response.status,
      })
    }
    const evidence = (await response.json()) as EvidencePackage
    const checksum = response.headers.get("X-Evidence-Checksum") || undefined
    const evidenceRecord = evidence as EvidencePackage & {
      evidence_package_id?: unknown
    }
    const evidenceId =
      typeof evidenceRecord.evidence_package_id === "string" &&
      evidenceRecord.evidence_package_id.length > 0
        ? evidenceRecord.evidence_package_id
        : `evidence_${jobId}`
    const blob = new Blob([JSON.stringify(evidence, null, 2)], {
      type: "application/json",
    })
    const filename = `${evidenceId}.json`
    downloadBlob(blob, filename)
    return { checksum, filename, jobId }
  },
}
