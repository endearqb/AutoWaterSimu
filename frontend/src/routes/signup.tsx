import {
  Box,
  Container,
  Heading,
  Image,
  Input,
  Text,
  VStack,
} from "@chakra-ui/react"
import {
  Link as RouterLink,
  createFileRoute,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock, FiUser } from "react-icons/fi"

import type { UserRegister } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "@/utils"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
  }

  return (
    <Box
      minH="100vh"
      bg="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)"
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
    >
      {/* 背景装饰 */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        opacity="0.03"
        backgroundImage="radial-gradient(circle at 20% 80%, #10b981 0%, transparent 50%), radial-gradient(circle at 80% 20%, #3b82f6 0%, transparent 50%)"
      />

      <Container
        as="form"
        onSubmit={handleSubmit(onSubmit)}
        maxW="md"
        bg="white"
        borderRadius="2xl"
        shadow="2xl"
        p={8}
        position="relative"
        zIndex={1}
      >
        <VStack gap={6} align="stretch">
          <VStack gap={4} textAlign="center">
            <VStack gap={2}>
              <Image
                src="/assets/images/E-logos-1.png"
                alt="ENVDAMA Logo"
                boxSize={8}
              />
              <Heading
                size="3xl"
                fontWeight="medium"
                bgGradient="to-r"
                gradientFrom="hsl(192,85%,52%)"
                gradientTo="hsl(212,98%,55%)"
                bgClip="text"
                letterSpacing="tight"
              >
                ENVDAMA
              </Heading>
            </VStack>
            <VStack gap={2}>
              <Text color="gray.600" fontSize="md">
                加入 ENVDAMA ，开启您的智能环保数据分析之旅
              </Text>
            </VStack>
          </VStack>
          <Field
            invalid={!!errors.full_name}
            errorText={errors.full_name?.message}
          >
            <InputGroup w="100%" startElement={<FiUser />}>
              <Input
                id="full_name"
                minLength={3}
                {...register("full_name", {
                  required: "Full Name is required",
                })}
                placeholder="Full Name"
                type="text"
              />
            </InputGroup>
          </Field>

          <Field invalid={!!errors.email} errorText={errors.email?.message}>
            <InputGroup w="100%" startElement={<FiUser />}>
              <Input
                id="email"
                {...register("email", {
                  required: "Email is required",
                  pattern: emailPattern,
                })}
                placeholder="Email"
                type="email"
              />
            </InputGroup>
          </Field>
          <PasswordInput
            type="password"
            startElement={<FiLock />}
            {...register("password", passwordRules())}
            placeholder="Password"
            errors={errors}
          />
          <PasswordInput
            type="confirm_password"
            startElement={<FiLock />}
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm Password"
            errors={errors}
          />
          <Button
            variant="solid"
            type="submit"
            loading={isSubmitting}
            size="lg"
            colorScheme="green"
            borderRadius="xl"
            py={6}
            fontSize="lg"
            fontWeight="600"
            _hover={{
              transform: "translateY(-1px)",
              shadow: "lg",
            }}
            transition="all 0.2s"
          >
            立即注册
          </Button>
          <Text textAlign="center" color="gray.600">
            已有账户？{" "}
            <RouterLink to="/login" className="main-link">
              立即登录
            </RouterLink>
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}

export default SignUp
