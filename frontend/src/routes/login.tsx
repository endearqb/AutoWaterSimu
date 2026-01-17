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
import { FiLock, FiMail } from "react-icons/fi"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { emailPattern, passwordRules } from "../utils"

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/dashboard",
      })
    }
  },
})

function Login() {
  const { loginMutation, error, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
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
                欢迎回到ENVDAMA，登录您的智能环保数据分析平台
              </Text>
            </VStack>
          </VStack>
          <Field
            invalid={!!errors.username}
            errorText={errors.username?.message || !!error}
          >
            <InputGroup w="100%" startElement={<FiMail />}>
              <Input
                id="username"
                {...register("username", {
                  required: "Username is required",
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
          <RouterLink to="/recover-password" className="main-link">
            忘记密码？
          </RouterLink>
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
            立即登录
          </Button>
          <Text textAlign="center" color="gray.600">
            还没有账户？{" "}
            <RouterLink to="/signup" className="main-link">
              立即注册
            </RouterLink>
          </Text>
        </VStack>
      </Container>
    </Box>
  )
}
