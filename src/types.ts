export type DatabaseProject = {
  createdAt: string;
  name: string;
  owner_id: string;
  size: number;
  url: string;
  visibility: string;
  path: string;
  submodule: string;
};

export type GHRepo = Omit<DatabaseProject, "path" | "submodule">;

export type SpinnerMessages = {
  initial: string;
  success: string;
  fail: string;
  resolution?: number;
};