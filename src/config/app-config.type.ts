export type AppConfig = {
  nodeEnv: string;
  name: string;
  workingDirectory: string;
  frontendDomain?: string;
  backendDomain: string;
  port: number;
  apiPrefix: string;
  corsOrigins: string[] | true;
  throttleTtlMs: number;
  throttleLimit: number;
};
