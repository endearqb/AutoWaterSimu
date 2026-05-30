import { open, save } from "@tauri-apps/plugin-dialog"

const PROJECT_PACKAGE_EXTENSION = "json"

export async function chooseProjectExportPath(
  projectId: string,
): Promise<string | null> {
  const selected = await save({
    title: "Export AutoWaterSimu Project",
    defaultPath: `${projectId}.autowatersimu-project.json`,
    filters: [
      {
        name: "AutoWaterSimu Project",
        extensions: [PROJECT_PACKAGE_EXTENSION],
      },
    ],
  })
  return selected ?? null
}

export async function chooseProjectImportPath(): Promise<string | null> {
  const selected = await open({
    title: "Import AutoWaterSimu Project",
    directory: false,
    multiple: false,
    filters: [
      {
        name: "AutoWaterSimu Project",
        extensions: [PROJECT_PACKAGE_EXTENSION],
      },
    ],
  })
  if (Array.isArray(selected)) {
    return selected[0] ?? null
  }
  return selected ?? null
}
