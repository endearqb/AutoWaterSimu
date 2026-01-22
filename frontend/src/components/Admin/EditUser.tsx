import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Controller, type SubmitHandler, useForm } from "react-hook-form"

import {
  Button,
  DialogActionTrigger,
  DialogRoot,
  DialogTrigger,
  Flex,
  Input,
  NativeSelect,
  Text,
  VStack,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaExchangeAlt } from "react-icons/fa"

import { type UserPublic, type UserUpdate, UsersService } from "@/client"
import type { ApiError } from "@/client/core/ApiError"
import useCustomToast from "@/hooks/useCustomToast"
import { confirmPasswordRules, getEmailPattern, handleError, passwordRules } from "@/utils"
import { useI18n } from "@/i18n"
import { Checkbox } from "../ui/checkbox"
import {
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog"
import { Field } from "../ui/field"

interface EditUserProps {
  user: UserPublic
}

interface UserUpdateForm extends UserUpdate {
  confirm_password?: string
}

const EditUser = ({ user }: EditUserProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const { t } = useI18n()
  const {
    control,
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserUpdateForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: user,
  })

  const mutation = useMutation({
    mutationFn: (data: UserUpdateForm) =>
      UsersService.updateUser({ userId: user.id, requestBody: data }),
    onSuccess: () => {
      showSuccessToast(t("admin.userUpdatedSuccess"))
      reset()
      setIsOpen(false)
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const onSubmit: SubmitHandler<UserUpdateForm> = async (data) => {
    if (data.password === "") {
      data.password = undefined
    }
    mutation.mutate(data)
  }

  return (
    <DialogRoot
      size={{ base: "xs", md: "md" }}
      placement="center"
      open={isOpen}
      onOpenChange={({ open }) => setIsOpen(open)}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FaExchangeAlt fontSize="16px" />
          {t("admin.editUser")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{t("admin.editUserTitle")}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text mb={4}>{t("admin.editUserDescription")}</Text>
            <VStack gap={4}>
              <Field
                required
                invalid={!!errors.email}
                errorText={errors.email?.message}
                label={t("admin.emailLabel")}
              >
                <Input
                  id="email"
                  {...register("email", {
                    required: t("validation.required"),
                    pattern: getEmailPattern(),
                  })}
                  placeholder={t("auth.emailPlaceholder")}
                  type="email"
                />
              </Field>

              <Field
                invalid={!!errors.full_name}
                errorText={errors.full_name?.message}
                label={t("admin.fullNameLabel")}
              >
                <Input
                  id="name"
                  {...register("full_name")}
                  placeholder={t("auth.fullNamePlaceholder")}
                  type="text"
                />
              </Field>

              <Field
                invalid={!!errors.password}
                errorText={errors.password?.message}
                label={t("admin.setPasswordLabel")}
              >
                <Input
                  id="password"
                  {...register("password", passwordRules(false))}
                  placeholder={t("auth.passwordPlaceholder")}
                  type="password"
                />
              </Field>

              <Field
                invalid={!!errors.confirm_password}
                errorText={errors.confirm_password?.message}
                label={t("admin.confirmPasswordLabel")}
              >
                <Input
                  id="confirm_password"
                  {...register(
                    "confirm_password",
                    confirmPasswordRules(getValues, false),
                  )}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  type="password"
                />
              </Field>

              <Field
                invalid={!!errors.user_type}
                errorText={errors.user_type?.message}
                label={t("admin.userTypeLabel")}
              >
                <NativeSelect.Root size="md">
                  <NativeSelect.Field
                    {...register("user_type")}
                    placeholder={t("admin.selectUserType")}
                  >
                    <option value="basic">{t("admin.userTypeBasic")}</option>
                    <option value="pro">{t("admin.userTypePro")}</option>
                    <option value="ultra">{t("admin.userTypeUltra")}</option>
                    <option value="enterprise">{t("admin.userTypeEnterprise")}</option>
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field>
            </VStack>

            <Flex mt={4} direction="column" gap={4}>
              <Controller
                control={control}
                name="is_superuser"
                render={({ field }) => (
                  <Field disabled={field.disabled} colorPalette="teal">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      {t("admin.isSuperuser")}
                    </Checkbox>
                  </Field>
                )}
              />
              <Controller
                control={control}
                name="is_active"
                render={({ field }) => (
                  <Field disabled={field.disabled} colorPalette="teal">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={({ checked }) => field.onChange(checked)}
                    >
                      {t("admin.isActive")}
                    </Checkbox>
                  </Field>
                )}
              />
            </Flex>
          </DialogBody>

          <DialogFooter gap={2}>
            <DialogActionTrigger asChild>
              <Button
                variant="subtle"
                colorPalette="gray"
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
            </DialogActionTrigger>
            <Button variant="solid" type="submit" loading={isSubmitting}>
              {t("common.save")}
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </form>
      </DialogContent>
    </DialogRoot>
  )
}

export default EditUser
