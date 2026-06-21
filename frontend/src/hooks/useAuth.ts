import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import type {
  Body_login_login_access_token as AccessToken,
  ApiError,
  UserPublic,
  UserRegister,
} from "@/client"
import { isStandaloneRuntime } from "@/shared/runtimeConfig"
import { handleError } from "@/utils"

const STANDALONE_USER: UserPublic = {
  created_at: "2026-06-21T00:00:00.000Z",
  email: "standalone@local",
  full_name: "Standalone Developer",
  id: "standalone:developer",
  is_active: true,
  is_superuser: false,
  updated_at: "2026-06-21T00:00:00.000Z",
  user_type: "ultra",
}

const isLoggedIn = () => {
  if (isStandaloneRuntime()) {
    return true
  }

  return localStorage.getItem("access_token") !== null
}

const useAuth = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      if (isStandaloneRuntime()) {
        return STANDALONE_USER
      }

      const { UsersService } = await import("@/client")
      return UsersService.readUserMe()
    },
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: async (data: UserRegister) => {
      if (isStandaloneRuntime()) {
        return STANDALONE_USER
      }

      const { UsersService } = await import("@/client")
      return UsersService.registerUser({ requestBody: data })
    },

    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    if (isStandaloneRuntime()) {
      return
    }

    const { LoginService } = await import("@/client")
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/dashboard" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("compute_access_token")
    navigate({ to: isStandaloneRuntime() ? "/dashboard" : "/login" })
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
    error,
    resetError: () => setError(null),
  }
}

export { isLoggedIn }
export default useAuth
