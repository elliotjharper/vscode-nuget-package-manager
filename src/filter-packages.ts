import { PackageInfo } from "./types";

export function filterPackages(
    packageMap: Map<string, PackageInfo>,
    searchText: string
): Map<string, PackageInfo> {
    if (!searchText) {
        return packageMap;
    }

    const filtered = new Map<string, PackageInfo>();
    const lowerSearch = searchText.toLowerCase();

    for (const [packageName, packageInfo] of packageMap) {
        // Check if package name matches
        const nameMatches = packageName.toLowerCase().includes(lowerSearch);

        // Check if any consumer's version matches
        const consumerMatches = packageInfo.consumers.some((consumer) =>
            consumer.version.toLowerCase().includes(lowerSearch)
        );

        if (nameMatches || consumerMatches) {
            filtered.set(packageName, packageInfo);
        }
    }

    return filtered;
}
