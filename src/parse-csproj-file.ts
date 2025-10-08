import * as fs from "fs";
import * as path from "path";
import { PackageReference } from "./types";

export async function parseCsprojFile(
  filePath: string
): Promise<PackageReference[]> {
  const packages: PackageReference[] = [];

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const projectName = path.basename(filePath);

    // Match PackageReference elements with Include and Version attributes
    // Handles both <PackageReference Include="..." Version="..." /> and separate attributes
    const packageRegex =
      /<PackageReference\s+Include="([^"]+)"[^>]*Version="([^"]+)"/g;
    let match;

    while ((match = packageRegex.exec(content)) !== null) {
      packages.push({
        name: match[1],
        version: match[2],
        projectFile: projectName,
      });
    }
  } catch (error) {
    console.error(`Error parsing csproj file ${filePath}:`, error);
  }

  return packages;
}
