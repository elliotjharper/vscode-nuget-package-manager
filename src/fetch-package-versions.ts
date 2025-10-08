import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as xml2js from "xml2js";

interface NuGetSource {
  key: string;
  value: string;
  protocolVersion?: string;
}

interface PackageVersion {
  version: string;
  listed?: boolean;
}

/**
 * Reads the nuget.config file and extracts package source URLs
 */
export async function getNuGetSources(): Promise<NuGetSource[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("No workspace folder found");
  }

  const nugetConfigPath = path.join(
    workspaceFolders[0].uri.fsPath,
    "nuget.config"
  );

  if (!fs.existsSync(nugetConfigPath)) {
    // If no nuget.config, return default NuGet.org source
    return [
      {
        key: "nuget.org",
        value: "https://api.nuget.org/v3/index.json",
        protocolVersion: "3",
      },
    ];
  }

  try {
    const configContent = fs.readFileSync(nugetConfigPath, "utf8");
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(configContent);

    const sources: NuGetSource[] = [];

    if (result.configuration?.packageSources?.[0]?.add) {
      const addEntries = result.configuration.packageSources[0].add;
      for (const entry of addEntries) {
        if (entry.$ && entry.$.key && entry.$.value) {
          sources.push({
            key: entry.$.key,
            value: entry.$.value,
            protocolVersion: entry.$.protocolVersion,
          });
        }
      }
    }

    return sources.length > 0
      ? sources
      : [
          {
            key: "nuget.org",
            value: "https://api.nuget.org/v3/index.json",
            protocolVersion: "3",
          },
        ];
  } catch (error) {
    console.error("Error parsing nuget.config:", error);
    // Fallback to default source
    return [
      {
        key: "nuget.org",
        value: "https://api.nuget.org/v3/index.json",
        protocolVersion: "3",
      },
    ];
  }
}

/**
 * Fetches available versions for a package from NuGet API v3
 */
export async function fetchPackageVersions(
  packageName: string,
  sourceUrl: string
): Promise<PackageVersion[]> {
  try {
    // First, get the service index
    const indexResponse = await fetch(sourceUrl);
    if (!indexResponse.ok) {
      throw new Error(
        `Failed to fetch service index: ${indexResponse.statusText}`
      );
    }

    const serviceIndex = (await indexResponse.json()) as any;

    // Find the PackageBaseAddress service
    const packageBaseService = serviceIndex.resources?.find(
      (resource: any) => resource["@type"] === "PackageBaseAddress/3.0.0"
    );

    if (!packageBaseService) {
      throw new Error("PackageBaseAddress service not found in service index");
    }

    const baseUrl = packageBaseService["@id"];

    // Construct the versions URL
    const versionsUrl = `${baseUrl}${packageName.toLowerCase()}/index.json`;

    const versionsResponse = await fetch(versionsUrl);
    if (!versionsResponse.ok) {
      if (versionsResponse.status === 404) {
        return []; // Package not found
      }
      throw new Error(
        `Failed to fetch package versions: ${versionsResponse.statusText}`
      );
    }

    const versionsData = (await versionsResponse.json()) as any;

    // Extract versions from the response
    const versions: PackageVersion[] = [];
    if (versionsData.versions) {
      for (const version of versionsData.versions) {
        versions.push({
          version: version,
          listed: true, // Assume listed if not specified
        });
      }
    }

    // Sort versions in descending order (newest first)
    versions.sort((a, b) => {
      try {
        return compareVersions(b.version, a.version);
      } catch {
        return b.version.localeCompare(a.version);
      }
    });

    return versions;
  } catch (error) {
    console.error(`Error fetching versions for package ${packageName}:`, error);
    return [];
  }
}

/**
 * Simple version comparison function
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.split(".").map((part) => {
    const numPart = part.split("-")[0]; // Handle pre-release versions
    return parseInt(numPart, 10) || 0;
  });
  const bParts = b.split(".").map((part) => {
    const numPart = part.split("-")[0]; // Handle pre-release versions
    return parseInt(numPart, 10) || 0;
  });

  const maxLength = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart > bPart) {
      return 1;
    }
    if (aPart < bPart) {
      return -1;
    }
  }

  return 0;
}

/**
 * Fetches available versions for a package from all configured NuGet sources
 */
export async function getAvailableVersions(
  packageName: string
): Promise<PackageVersion[]> {
  const sources = await getNuGetSources();

  for (const source of sources) {
    try {
      const versions = await fetchPackageVersions(packageName, source.value);
      if (versions.length > 0) {
        return versions;
      }
    } catch (error) {
      console.error(`Error fetching from source ${source.key}:`, error);
      continue; // Try next source
    }
  }

  return []; // No versions found from any source
}
