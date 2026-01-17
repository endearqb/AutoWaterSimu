import { Box, Container, Heading } from "@chakra-ui/react"
import { InfiniteMovingCards } from "./InfiniteMovingCards"

const testimonials = [
  {
    name: "张明",
    avatarUrl: "/assets/avatars/zhang-ming.jpg",
    handle: "@张明Tech",
    verified: true,
    quote:
      "我们现在每月节省1-2个工作日。由于改进的数据分析和自动化处理，我们现在每月节省1-2个工作日，并且通过仪表板更好地了解我们的业务状况。",
  },
  {
    name: "李华",
    avatarUrl: "/assets/avatars/li-hua.jpg",
    handle: "@李华CEO",
    verified: true,
    quote:
      "没有ENVDAMA，我可能会失去很多商业机会。ENVDAMA帮助我们快速分析市场数据，做出正确的商业决策，避免了重大损失。",
  },
  {
    name: "王芳",
    avatarUrl: "/assets/avatars/wang-fang.jpg",
    handle: "@王芳PM",
    verified: true,
    quote:
      "它完全改变了我管理日常任务的方式。从数据分析到项目跟踪，将所有信息集中在一个地方，这种变化是显著的。",
  },
  {
    name: "陈强",
    avatarUrl: "/assets/avatars/chen-qiang.jpg",
    handle: "@陈强DA",
    verified: true,
    quote:
      "我更喜欢有一个工具来处理数据分析，就像Deel对HR一样。ENVDAMA帮助我找到了与技术顾问的妥协：我不使用他支持的笨重工具，而是使用一个真正用户友好的工具。",
  },
  {
    name: "赵敏",
    handle: "@赵敏CTO",
    verified: false,
    quote: "这绝对令人惊叹！我们团队的工作效率提升了很多。",
  },
  {
    name: "刘洋",
    handle: "@刘洋CFO",
    verified: true,
    quote: "太棒了，看起来很棒 🔥 财务数据分析变得如此简单。",
  },
  {
    name: "周杰",
    handle: "@周杰技术",
    verified: false,
    quote: "毫不费力！您与银行数据的流畅集成让我印象深刻。",
  },
  {
    name: "吴梅",
    handle: "@吴梅产品",
    verified: true,
    quote: "我们喜欢 @envdama 🖤 产品体验非常棒！",
  },
  {
    name: "孙强",
    handle: "@孙强运营",
    verified: true,
    quote: "ENVDAMA让我们的运营管理变得更加高效，数据可视化功能特别出色。",
  },
  {
    name: "马丽",
    handle: "@马丽设计",
    verified: false,
    quote: "界面设计简洁美观，用户体验很好，我们的客户都很满意。",
  },
  {
    name: "林涛",
    handle: "@林涛销售",
    verified: true,
    quote: "销售数据分析功能帮助我们更好地了解客户需求，提高了转化率。",
  },
]

export function UserTestimonials() {
  return (
    <Box py={20}>
      <Container maxW="container.xl">
        <Box>
          <Heading
            fontSize={{ base: "3xl", md: "4xl" }}
            fontWeight="medium"
            color="gray.800"
            _dark={{ color: "gray.100" }}
            mb={8}
          >
            用户怎么说
          </Heading>
          <InfiniteMovingCards
            items={testimonials}
            direction="left"
            speed="slow"
          />
        </Box>
      </Container>
    </Box>
  )
}
