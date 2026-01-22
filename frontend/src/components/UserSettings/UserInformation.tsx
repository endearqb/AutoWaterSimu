import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Input,
  Text,
} from "@chakra-ui/react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"

import {
  type ApiError,
  type UserPublic,
  type UserUpdateMe,
  UsersService,
} from "@/client"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { getEmailPattern, handleError } from "@/utils"
import { useI18n } from "@/i18n"
import { Field } from "../ui/field"

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const { t } = useI18n()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast(t("userSettings.updateProfileSuccess"))
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  useEffect(() => {
    if (currentUser) {
      reset({
        full_name: currentUser.full_name,
        email: currentUser.email,
      })
    }
  }, [currentUser, reset])

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  return (
    <>
      <Container maxW="full">
        <Heading size="sm" py={4}>
          {t("userSettings.infoTitle")}
        </Heading>
        <Box
          w={{ sm: "full", md: "sm" }}
          as="form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Field label={t("userSettings.userNameLabel")}>
            {editMode ? (
              <Input
                {...register("full_name", { maxLength: 30 })}
                type="text"
                size="md"
              />
            ) : (
              <Text
                fontSize="md"
                py={2}
                color={!currentUser?.full_name ? "gray" : "inherit"}
                truncate
                maxW="sm"
              >
                {currentUser?.full_name || t("common.notAvailable")}
              </Text>
            )}
          </Field>
          <Field
            mt={4}
            label={t("userSettings.emailLabel")}
            invalid={!!errors.email}
            errorText={errors.email?.message}
          >
            {editMode ? (
              <Input
                {...register("email", {
                  required: t("validation.required"),
                  pattern: getEmailPattern(),
                })}
                type="email"
                size="md"
              />
            ) : (
              <Text fontSize="md" py={2} truncate maxW="sm">
                {currentUser?.email}
              </Text>
            )}
          </Field>
          <Field mt={4} label={t("userSettings.userTypeLabel")}>
            <Text fontSize="md" py={2} truncate maxW="sm">
              {currentUser?.user_type === "pro"
                ? t("userSettings.userTypePro")
                : currentUser?.user_type === "ultra"
                  ? t("userSettings.userTypeUltra")
                  : currentUser?.user_type === "enterprise"
                    ? t("userSettings.userTypeEnterprise")
                    : t("userSettings.userTypeBasic")}
            </Text>
          </Field>
          <Flex mt={4} gap={3}>
            <Button
              variant="solid"
              onClick={toggleEditMode}
              type={editMode ? "button" : "submit"}
              loading={editMode ? isSubmitting : false}
              disabled={editMode ? !isDirty || !getValues("email") : false}
            >
              {editMode ? t("common.save") : t("common.edit")}
            </Button>
            {editMode && (
              <Button
                variant="subtle"
                colorPalette="gray"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
            )}
          </Flex>
        </Box>
      </Container>
    </>
  )
}

export default UserInformation
