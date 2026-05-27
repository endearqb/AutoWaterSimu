import { defineConfig } from "@hey-api/openapi-ts"

export default defineConfig({
  client: "legacy/axios",
  input: "../apps/api/openapi/compute.openapi.json",
  output: "./src/client/compute",
  plugins: [
    {
      name: "@hey-api/sdk",
      asClass: true,
      operationId: true,
    },
  ],
})
