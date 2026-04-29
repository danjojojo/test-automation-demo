import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { parse } from 'yaml';

export const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    version: string;
  };
  security?: SecurityRequirement[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
}

export type PathItem = Partial<Record<HttpMethod, Operation>>;

export interface Operation {
  operationId?: string;
  summary?: string;
  parameters?: Array<Parameter | ReferenceObject>;
  requestBody?: RequestBody;
  responses?: Record<string, ResponseObject>;
  security?: SecurityRequirement[];
}

export interface ReferenceObject {
  $ref: string;
}

export interface Parameter {
  name: string;
  in: 'path' | 'query' | 'header' | 'cookie';
  required?: boolean;
  example?: unknown;
  schema?: OpenApiSchema;
}

export interface RequestBody {
  required?: boolean;
  content?: Record<string, MediaTypeObject>;
}

export interface ResponseObject {
  description?: string;
  content?: Record<string, MediaTypeObject>;
}

export interface MediaTypeObject {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
}

export interface OpenApiSchema {
  $ref?: string;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  type?: string;
  format?: string;
  default?: unknown;
  example?: unknown;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
}

export type SecurityRequirement = Record<string, string[]>;

export interface ExampleObject {
  value?: unknown;
  summary?: string;
}

export interface OperationEntry {
  method: HttpMethod;
  path: string;
  operation: Operation;
}

export interface JsonExample {
  status: string;
  mediaType: string;
  value: unknown;
}

export interface ResponseContract {
  status: string;
  mediaType?: string;
  value?: unknown;
}

export async function loadSpec(specInput: string): Promise<OpenApiSpec> {
  const document = parse(await readSpecText(specInput)) as OpenApiSpec;

  if (!document.openapi?.startsWith('3.0.')) {
    throw new Error(`Expected an OpenAPI 3.0.x document in ${specInput}`);
  }

  if (!document.paths || Object.keys(document.paths).length === 0) {
    throw new Error(`No paths found in ${specInput}`);
  }

  return document;
}

export function writeGeneratedFile(outputPath: string, contents: string): void {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, contents);
}

export function listOperations(spec: OpenApiSpec): OperationEntry[] {
  const entries: OperationEntry[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (operation) {
        entries.push({ method, path, operation });
      }
    }
  }

  return entries;
}

export function selectSuccessJsonExample(operation: Operation): JsonExample | undefined {
  const responses = operation.responses ?? {};
  const successStatuses = Object.keys(responses)
    .filter((status) => /^2\d\d$/.test(status))
    .sort();

  for (const status of successStatuses) {
    const response = responses[status];
    const media = selectJsonMedia(response);
    if (!media) {
      continue;
    }

    const value = extractExample(media.object);
    if (value !== undefined) {
      return { status, mediaType: media.mediaType, value };
    }
  }

  return undefined;
}

export function selectSuccessResponseContract(operation: Operation): ResponseContract | undefined {
  const responses = operation.responses ?? {};
  const successStatuses = Object.keys(responses)
    .filter((status) => /^2\d\d$/.test(status))
    .sort();

  for (const status of successStatuses) {
    const response = responses[status];
    const media = selectJsonMedia(response);

    if (!media) {
      return { status };
    }

    return {
      status,
      mediaType: media.mediaType,
      value: extractExample(media.object)
    };
  }

  return undefined;
}

export function selectRequestJsonExample(operation: Operation): unknown {
  const media = selectRequestJsonMedia(operation);
  return media ? extractExample(media) : undefined;
}

export function selectRequestJsonMedia(operation: Operation): MediaTypeObject | undefined {
  const content = operation.requestBody?.content ?? {};
  return content['application/json'] ?? Object.entries(content).find(([mediaType]) => mediaType.includes('json'))?.[1];
}

export function toExpressPath(openApiPath: string): string {
  return openApiPath.replaceAll(/{/g, ':').replaceAll('}', '');
}

export function toRequestPath(openApiPath: string, operation: Operation): string {
  return openApiPath.replace(/{([^}]+)}/g, (_, name: string) => encodeURIComponent(String(parameterValue(name, operation))));
}

export function toRequestUrl(openApiPath: string, operation: Operation): string {
  const requestPath = toRequestPath(openApiPath, operation);
  const searchParams = new URLSearchParams();

  for (const parameter of concreteParameters(operation)) {
    if (parameter.in === 'query') {
      searchParams.set(parameter.name, String(sampleParameterValue(parameter)));
    }
  }

  const query = searchParams.toString();
  return query ? `${requestPath}?${query}` : requestPath;
}

export function operationLabel(entry: OperationEntry): string {
  const id = entry.operation.operationId ? ` ${entry.operation.operationId}` : '';
  return `${entry.method.toUpperCase()} ${entry.path}${id}`;
}

export function toTsValue(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function generatedBanner(source: string, generator: string): string {
  return [
    '/* eslint-disable */',
    `// Generated by ${generator} from ${source}.`,
    '// Re-run npm run generate after changing the OpenAPI spec.',
    ''
  ].join('\n');
}

async function readSpecText(specInput: string): Promise<string> {
  if (/^https?:\/\//i.test(specInput)) {
    const response = await fetch(specInput);
    if (!response.ok) {
      throw new Error(`Unable to fetch OpenAPI spec from ${specInput}: ${response.status} ${response.statusText}`);
    }

    return response.text();
  }

  return readFileSync(specInput, 'utf8');
}

function selectJsonMedia(response?: ResponseObject): { mediaType: string; object: MediaTypeObject } | undefined {
  const content = response?.content ?? {};
  const direct = content['application/json'];
  if (direct) {
    return { mediaType: 'application/json', object: direct };
  }

  const fallback = Object.entries(content).find(([mediaType]) => mediaType.includes('json'));
  return fallback ? { mediaType: fallback[0], object: fallback[1] } : undefined;
}

function extractExample(media: MediaTypeObject): unknown {
  if (media.example !== undefined) {
    return media.example;
  }

  const firstNamedExample = Object.values(media.examples ?? {})[0];
  return firstNamedExample?.value;
}

function parameterValue(name: string, operation: Operation): unknown {
  const parameter = concreteParameters(operation).find((candidate) => candidate.in === 'path' && candidate.name === name);
  return parameter ? sampleParameterValue(parameter) : `sample-${name}`;
}

export function concreteParameters(operation: Operation): Parameter[] {
  return operation.parameters?.filter(isParameter) ?? [];
}

function isParameter(parameter: Parameter | ReferenceObject): parameter is Parameter {
  return 'name' in parameter && 'in' in parameter;
}

export function sampleParameterValue(parameter: Parameter): unknown {
  if (parameter.example !== undefined) {
    return parameter.example;
  }

  if (parameter.schema?.example !== undefined) {
    return parameter.schema.example;
  }

  if (parameter.schema?.default !== undefined) {
    return parameter.schema.default;
  }

  switch (parameter.schema?.type) {
    case 'integer':
    case 'number':
      return 1;
    case 'boolean':
      return true;
    default:
      return `sample-${parameter.name}`;
  }
}
