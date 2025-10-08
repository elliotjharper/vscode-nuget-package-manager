import * as fs from "fs";
import * as path from "path";

export async function findCsprojFiles(dir: string): Promise<string[]> {
  const csprojFiles: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules and other common directories
      if (
        entry.isDirectory() &&
        !["node_modules", "bin", "obj", ".git"].includes(entry.name)
      ) {
        const subFiles = await findCsprojFiles(fullPath);
        csprojFiles.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith(".csproj")) {
        csprojFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return csprojFiles;
}
