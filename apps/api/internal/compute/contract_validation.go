package compute

import platformcontracts "autowatersimu/apps/api/internal/platform/contracts"

func validateContractDocument(bytes []byte, validator *ContractValidator) (ContractValidationResponse, error) {
	base, err := platformcontracts.ValidateDocument(bytes, validator)
	return ContractValidationResponse{
		SchemaVersion:         base.SchemaVersion,
		DocumentSchemaVersion: base.DocumentSchemaVersion,
		ContractSchema:        base.ContractSchema,
		Valid:                 base.Valid,
		Errors:                base.Errors,
		Warnings:              base.Warnings,
	}, err
}
