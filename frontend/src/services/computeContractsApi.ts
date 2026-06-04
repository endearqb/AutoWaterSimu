import { DefaultService } from "@/client/compute"
import type {
  ConstraintApplicationPlan,
  ContractValidationResponse,
  DraftConfirmationRecord,
  JobSnapshot,
  ResultExplanationRecord,
  ResultExplanationReviewRequest,
} from "@/client/compute"

export const computeContractsApi = {
  submitResultExplanation(
    jobId: string,
    document: Record<string, unknown>,
  ): Promise<ResultExplanationRecord> {
    return DefaultService.submitResultExplanation({
      jobId,
      requestBody: document,
    })
  },

  getResultExplanation(
    jobId: string,
    explanationId: string,
  ): Promise<ResultExplanationRecord> {
    return DefaultService.getResultExplanation({ explanationId, jobId })
  },

  reviewResultExplanation(
    jobId: string,
    explanationId: string,
    request: ResultExplanationReviewRequest,
  ): Promise<ResultExplanationRecord> {
    return DefaultService.reviewResultExplanation({
      explanationId,
      jobId,
      requestBody: request,
    })
  },

  publishResultExplanation(
    jobId: string,
    explanationId: string,
  ): Promise<ResultExplanationRecord> {
    return DefaultService.publishResultExplanation({ explanationId, jobId })
  },

  validateContractDocument(
    document: Record<string, unknown>,
  ): Promise<ContractValidationResponse> {
    return DefaultService.validateContract({ requestBody: document })
  },

  confirmDraftDocument(
    document: Record<string, unknown>,
  ): Promise<ContractValidationResponse> {
    return DefaultService.confirmDraft({ requestBody: document })
  },

  getDraftConfirmation(
    confirmationId: string,
  ): Promise<DraftConfirmationRecord> {
    return DefaultService.getDraftConfirmation({ confirmationId })
  },

  getConstraintApplicationPlan(
    confirmationId: string,
  ): Promise<ConstraintApplicationPlan> {
    return DefaultService.getConstraintApplicationPlan({ confirmationId })
  },

  promoteDraftConfirmationToSimulationCheck(
    confirmationId: string,
  ): Promise<JobSnapshot> {
    return DefaultService.promoteDraftConfirmationToSimulationCheck({
      confirmationId,
    })
  },
}
