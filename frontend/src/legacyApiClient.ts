export const configureLegacyApiClient = async () => {
  const { OpenAPI } = await import("./client")
  OpenAPI.BASE = import.meta.env.VITE_API_URL
  OpenAPI.TOKEN = async () => localStorage.getItem("access_token") || ""
}
