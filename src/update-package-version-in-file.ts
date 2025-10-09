import * as fs from "fs";

export async function updatePackageVersionInFile(
    filePath: string,
    packageName: string,
    targetVersion: string
): Promise<void> {
    try {
        let content = fs.readFileSync(filePath, "utf-8");

        // Create regex to find the specific package reference
        const packageRegex = new RegExp(
            `(<PackageReference\\s+Include="${packageName.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            )}"[^>]*Version=")([^"]+)(")`,
            "g"
        );

        // Replace the version if the package is found
        const updatedContent = content.replace(
            packageRegex,
            `$1${targetVersion}$3`
        );

        // Only write if content changed
        if (updatedContent !== content) {
            fs.writeFileSync(filePath, updatedContent, "utf-8");
        }
    } catch (error) {
        console.error(`Error updating package version in ${filePath}:`, error);
        throw error;
    }
}
