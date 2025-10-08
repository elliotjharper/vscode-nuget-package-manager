export interface PackageConsumer {
  projectFile: string;
  version: string;
}

export interface PackageInfo {
  name: string;
  consumers: PackageConsumer[];
}

export interface PackageReference {
  name: string;
  version: string;
  projectFile: string;
}
