import { Container, Heading, Text } from "@chakra-ui/react"

import DeleteConfirmation from "./DeleteConfirmation"

const DeleteAccount = () => {
  return (
    <Container maxW="full">
      <Heading size="sm" py={4}>
        删除账号
      </Heading>
      <Text>永久删除您的数据和与您账号关联的所有内容。</Text>
      <DeleteConfirmation />
    </Container>
  )
}
export default DeleteAccount
