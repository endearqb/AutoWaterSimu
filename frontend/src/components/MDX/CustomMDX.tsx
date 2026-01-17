import { Box, Code, Image, Link } from "@chakra-ui/react"
import { Link as RouterLink } from "@tanstack/react-router"
import React from "react"
import ReactMarkdown from "react-markdown"
import { highlight } from "sugar-high"
const RouterLinkAny = RouterLink as any

interface TableProps {
  data: {
    headers: string[]
    rows: string[][]
  }
}

function Table({ data }: TableProps) {
  const headers = data.headers.map((header) => (
    <th
      key={header}
      style={{ padding: "8px", borderBottom: "1px solid #e2e8f0" }}
    >
      {header}
    </th>
  ))

  const rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td
          key={cellIndex}
          style={{ padding: "8px", borderBottom: "1px solid #f7fafc" }}
        >
          {cell}
        </td>
      ))}
    </tr>
  ))

  return (
    <Box overflowX="auto" my={4}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>{headers}</tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </Box>
  )
}

interface CustomLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
}

function CustomLink({ href, ...props }: CustomLinkProps) {
  if (href.startsWith("/")) {
    return (
      <RouterLinkAny
        to={href}
        {...props}
        style={{ color: "#3182ce", textDecoration: "underline" }}
      >
        {props.children}
      </RouterLinkAny>
    )
  }

  if (href.startsWith("#")) {
    return (
      <Link
        href={href}
        color="blue.500"
        _hover={{ textDecoration: "underline" }}
        {...props}
      />
    )
  }

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="blue.500"
      _hover={{ textDecoration: "underline" }}
      {...props}
    />
  )
}

interface RoundedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
}

function RoundedImage({
  src,
  alt,
  width,
  height,
  ...props
}: RoundedImageProps) {
  return (
    <Box my={6} textAlign="center">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        borderRadius="md"
        shadow="md"
        {...props}
      />
    </Box>
  )
}

interface CodeBlockProps {
  children: string
}

function CodeBlock({ children, ...props }: CodeBlockProps) {
  const codeHTML = highlight(children)
  return (
    <Code
      display="block"
      p={4}
      bg="gray.100"
      borderRadius="md"
      fontSize="sm"
      overflowX="auto"
      dangerouslySetInnerHTML={{ __html: codeHTML }}
      {...props}
    />
  )
}

function InlineCode({ children, ...props }: { children: React.ReactNode }) {
  return (
    <Code
      px={1}
      py={0.5}
      bg="gray.100"
      borderRadius="sm"
      fontSize="sm"
      {...props}
    >
      {children}
    </Code>
  )
}

function slugify(str: string): string {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/&/g, "-and-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
}

function createHeading(level: number) {
  const Heading = (props: any) => {
    const { children, ...rest } = props
    const slug = slugify(children as string)
    const fontSize = {
      1: "2xl",
      2: "xl",
      3: "lg",
      4: "md",
      5: "sm",
      6: "xs",
    }[level] as any

    return React.createElement(
      Box,
      {
        as: `h${level}`,
        id: slug,
        fontSize,
        fontWeight: "semibold",
        mt: level === 1 ? 8 : 6,
        mb: 4,
        color: "gray.800",
        ...rest,
      },
      children,
    )
  }

  Heading.displayName = `Heading${level}`
  return Heading
}

interface IframeProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
  src: string
}

function Iframe({ src, ...props }: IframeProps) {
  return (
    <Box my={6}>
      <iframe
        src={src}
        style={{
          width: "100%",
          height: "400px",
          border: "none",
          borderRadius: "8px",
        }}
        {...props}
      />
    </Box>
  )
}

// 自定义段落组件
function Paragraph(props: any) {
  return <Box as="p" mb={4} lineHeight="1.7" color="gray.700" {...props} />
}

// 自定义列表组件
function UnorderedList(props: any) {
  return <Box as="ul" pl={6} mb={4} color="gray.700" {...props} />
}

function OrderedList(props: any) {
  return <Box as="ol" pl={6} mb={4} color="gray.700" {...props} />
}

function ListItem(props: any) {
  return <Box as="li" mb={2} {...props} />
}

export const mdxComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  p: Paragraph,
  ul: UnorderedList,
  ol: OrderedList,
  li: ListItem,
  img: RoundedImage as any,
  Image: RoundedImage as any,
  a: CustomLink as any,
  code: InlineCode as any,
  pre: CodeBlock as any,
  Table: Table as any,
  iframe: Iframe as any,
}

interface CustomMDXProps {
  source: string
  components?: Record<string, React.ComponentType<any>>
}

export function CustomMDX({
  source,
  components: customComponents,
  ...props
}: CustomMDXProps) {
  return (
    <ReactMarkdown
      components={{ ...mdxComponents, ...(customComponents || {}) } as any}
      {...props}
    >
      {source}
    </ReactMarkdown>
  )
}
