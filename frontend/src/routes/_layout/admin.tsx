import { Badge, Container, Flex, Heading, Table } from "@chakra-ui/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import AddUser from "@/components/Admin/AddUser"
import { UserActionsMenu } from "@/components/Common/UserActionsMenu"
import PendingUsers from "@/components/Pending/PendingUsers"
import {
  PaginationItems,
  PaginationNextTrigger,
  PaginationPrevTrigger,
  PaginationRoot,
} from "@/components/ui/pagination.tsx"
import { useI18n } from "@/i18n"

const usersSearchSchema = z.object({
  page: z.number().catch(1),
})

const PER_PAGE = 5

function getUsersQueryOptions({ page }: { page: number }) {
  return {
    queryFn: () =>
      UsersService.readUsers({ skip: (page - 1) * PER_PAGE, limit: PER_PAGE }),
    queryKey: ["users", { page }],
  }
}

export const Route = createFileRoute("/_layout/admin")({
  component: Admin,
  validateSearch: (search) => usersSearchSchema.parse(search),
})

function UsersTable() {
  const queryClient = useQueryClient()
  const currentUser = queryClient.getQueryData<UserPublic>(["currentUser"])
  const navigate = useNavigate({ from: Route.fullPath })
  const { page } = Route.useSearch()
  const { t } = useI18n()

  const { data, isLoading, isPlaceholderData } = useQuery({
    ...getUsersQueryOptions({ page }),
    placeholderData: (prevData) => prevData,
  })

  const setPage = (page: number) =>
    navigate({
      search: (prev: any) => ({ ...prev, page }),
    })

  const users = data?.data.slice(0, PER_PAGE) ?? []
  const count = data?.count ?? 0

  if (isLoading) {
    return <PendingUsers />
  }

  return (
    <>
      <Table.Root size={{ base: "sm", md: "md" }}>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader w="sm">
              {t("admin.fullNameLabel")}
            </Table.ColumnHeader>
            <Table.ColumnHeader w="sm">
              {t("admin.emailLabel")}
            </Table.ColumnHeader>
            <Table.ColumnHeader w="sm">{t("common.role")}</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">
              {t("admin.userTypeLabel")}
            </Table.ColumnHeader>
            <Table.ColumnHeader w="sm">{t("common.status")}</Table.ColumnHeader>
            <Table.ColumnHeader w="sm">
              {t("common.actions")}
            </Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {users?.map((user) => (
            <Table.Row key={user.id} opacity={isPlaceholderData ? 0.5 : 1}>
              <Table.Cell color={!user.full_name ? "gray" : "inherit"}>
                {user.full_name || t("common.notAvailable")}
                {currentUser?.id === user.id && (
                  <Badge ml="1" colorScheme="teal">
                    {t("common.you")}
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell truncate maxW="sm">
                {user.email}
              </Table.Cell>
              <Table.Cell>
                {user.is_superuser
                  ? t("admin.roleSuperuser")
                  : t("admin.roleUser")}
              </Table.Cell>
              <Table.Cell>
                <Badge
                  colorScheme={
                    user.user_type === "enterprise"
                      ? "purple"
                      : user.user_type === "ultra"
                        ? "blue"
                        : user.user_type === "pro"
                          ? "green"
                          : "gray"
                  }
                >
                  {user.user_type === "pro"
                    ? t("userSettings.userTypePro")
                    : user.user_type === "ultra"
                      ? t("userSettings.userTypeUltra")
                      : user.user_type === "enterprise"
                        ? t("userSettings.userTypeEnterprise")
                        : t("userSettings.userTypeBasic")}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                {user.is_active ? t("common.active") : t("common.inactive")}
              </Table.Cell>
              <Table.Cell>
                <UserActionsMenu
                  user={user}
                  disabled={currentUser?.id === user.id}
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Flex justifyContent="flex-end" mt={4}>
        <PaginationRoot
          count={count}
          pageSize={PER_PAGE}
          onPageChange={({ page }) => setPage(page)}
        >
          <Flex>
            <PaginationPrevTrigger />
            <PaginationItems />
            <PaginationNextTrigger />
          </Flex>
        </PaginationRoot>
      </Flex>
    </>
  )
}

function Admin() {
  const { t } = useI18n()

  return (
    <Container maxW="full">
      <Heading size="lg" pt={12}>
        {t("admin.title")}
      </Heading>

      <AddUser />
      <UsersTable />
    </Container>
  )
}
