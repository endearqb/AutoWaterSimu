import { Alert, Box } from "@chakra-ui/react"
import type React from "react"

interface ValidationError {
  loc: string[]
  msg: string
  type: string
  input?: any
}

interface ValidationErrorDisplayProps {
  errors: ValidationError[]
  className?: string
}

/**
 * 显示详细的验证错误信息
 */
export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  className,
}) => {
  if (!errors || errors.length === 0) {
    return null
  }

  return (
    <Alert.Root status="error" className={className}>
      <Alert.Indicator />
      <Box>
        <Alert.Title>Validation Errors</Alert.Title>
        <Alert.Description>
          {errors.length === 1 ? (
            <div>
              <strong>{errors[0].loc.join(".")}:</strong> {errors[0].msg}
              {errors[0].input && (
                <div
                  style={{
                    fontSize: "0.875rem",
                    marginTop: "0.25rem",
                    opacity: 0.8,
                  }}
                >
                  Received: {JSON.stringify(errors[0].input)}
                </div>
              )}
            </div>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
              {errors.map((error, index) => (
                <li key={index} style={{ marginBottom: "0.5rem" }}>
                  <strong>{error.loc.join(".")}:</strong> {error.msg}
                  {error.input && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        marginTop: "0.25rem",
                        opacity: 0.8,
                      }}
                    >
                      Received: {JSON.stringify(error.input)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Alert.Description>
      </Box>
    </Alert.Root>
  )
}

interface FieldErrorProps {
  error?: ValidationError
  className?: string
}

/**
 * 显示单个字段的验证错误
 */
export const FieldError: React.FC<FieldErrorProps> = ({ error, className }) => {
  if (!error) {
    return null
  }

  return (
    <div
      className={className}
      style={{ color: "red", fontSize: "0.875rem", marginTop: "0.25rem" }}
    >
      {error.msg}
      {error.input && (
        <div
          style={{ fontSize: "0.75rem", marginTop: "0.125rem", opacity: 0.8 }}
        >
          Received: {JSON.stringify(error.input)}
        </div>
      )}
    </div>
  )
}

/**
 * 解析API错误响应中的验证错误
 */
export const parseValidationErrors = (error: any): ValidationError[] => {
  if (!error?.body?.detail) {
    return []
  }

  const detail = error.body.detail

  // 如果是验证错误数组
  if (Array.isArray(detail)) {
    return detail.filter((err) => err.loc && err.msg)
  }

  return []
}

/**
 * 根据字段路径查找对应的验证错误
 */
export const findFieldError = (
  errors: ValidationError[],
  fieldPath: string,
): ValidationError | undefined => {
  return errors.find((error) => error.loc && error.loc.join(".") === fieldPath)
}
