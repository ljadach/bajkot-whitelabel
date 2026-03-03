declare module '@langfuse/tracing' {
  type Observation = {
    update: (data: Record<string, unknown>) => Observation;
    end: () => void;
  };

  export function startActiveObservation<T>(name: string, handler: (span: Observation) => Promise<T>): Promise<T>;

  export function startObservation(name: string, payload?: Record<string, unknown>, options?: { asType?: string }): Observation;
}
