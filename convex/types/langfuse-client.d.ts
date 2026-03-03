declare module '@langfuse/client' {
  type PromptRecord = {
    prompt: any;
    config?: Record<string, unknown>;
    compile?: (vars: Record<string, string>) => any;
    type?: 'text' | 'chat';
  };

  type PromptGetOptions = {
    label?: string;
    version?: number;
    type?: 'text' | 'chat';
  };

  export class LangfuseClient {
    constructor(config?: { secretKey?: string; publicKey?: string; baseUrl?: string });
    prompt: {
      get: (name: string, options?: PromptGetOptions) => Promise<PromptRecord>;
      create: (params: any) => Promise<any>;
    };
  }
}
