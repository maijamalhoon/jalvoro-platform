// The repository-wide Next.js TypeScript project includes every *.ts file.
// This function executes under the Supabase Deno runtime, where deno.json and
// the Edge Runtime declaration are authoritative. These minimal declarations
// let the root project type-check the same source without adding a Node runtime
// dependency or widening the function's production privileges. Runtime module
// resolution remains defined exclusively by the function-local deno.json.

declare const Deno: {
  readonly env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "postgres" {
  interface PostgresOptions {
    readonly prepare?: boolean;
    readonly max?: number;
    readonly connect_timeout?: number;
    readonly idle_timeout?: number;
  }

  interface Sql {
    <T extends readonly Record<string, unknown>[] = readonly Record<string, unknown>[]>(
      strings: TemplateStringsArray,
      ...values: readonly unknown[]
    ): Promise<T>;

    end(options?: Readonly<{ timeout?: number }>): Promise<void>;
  }

  export default function postgres(
    connectionString: string,
    options?: PostgresOptions,
  ): Sql;
}
