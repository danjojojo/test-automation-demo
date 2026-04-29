import { parseArgs } from 'node:util';
import {
  concreteParameters,
  generatedBanner,
  listOperations,
  loadSpec,
  operationLabel,
  sampleParameterValue,
  selectRequestJsonExample,
  selectRequestJsonMedia,
  toTsValue,
  writeGeneratedFile,
  type OpenApiSchema,
  type OpenApiSpec,
  type Operation,
  type OperationEntry,
  type Parameter
} from './lib/openapi.js';

interface EdgeCase {
  title: string;
  method: string;
  path: string;
  operation?: Operation;
  expectedStatus: number;
  pathOverrides?: Record<string, unknown>;
  queryOverrides?: Record<string, unknown>;
  omittedQueryParameters?: Set<string>;
  headerOverrides?: Record<string, unknown>;
  omittedHeaderParameters?: Set<string>;
  body?: unknown;
  omitBody?: boolean;
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    spec: {
      type: 'string',
      short: 's'
    },
    output: {
      type: 'string',
      short: 'o'
    }
  }
});

const specInput = values.spec ?? positionals[0] ?? process.env.OPENAPI_SPEC ?? 'openapi/api-with-examples.yaml';
const outputPath = values.output ?? positionals[1] ?? process.env.OPENAPI_EDGE_TEST_OUTPUT ?? 'tests/generated/openapi.edge.spec.ts';
const spec = await loadSpec(specInput);

const edgeCases = [
  unknownPathCase(),
  ...listOperations(spec).flatMap((entry) => edgeCasesForOperation(spec, entry))
];

const testBlocks = edgeCases.map(buildTestBlock);
const contents = `${generatedBanner(specInput, 'scripts/generate-edge-tests.ts')}import { expect, test } from '@playwright/test';

test.describe('OpenAPI generated edge cases', () => {
${testBlocks.join('\n\n')}
});
`;

writeGeneratedFile(outputPath, contents);

console.log(`Generated ${testBlocks.length} Playwright edge tests from ${specInput} -> ${outputPath}`);
for (const edgeCase of edgeCases) {
  console.log(`- ${edgeCase.title}`);
}

function unknownPathCase(): EdgeCase {
  return {
    title: 'Undocumented path returns 404',
    method: 'GET',
    path: '/__openapi_generated_edge_not_found__',
    expectedStatus: 404
  };
}

function edgeCasesForOperation(specDocument: OpenApiSpec, entry: OperationEntry): EdgeCase[] {
  const cases: EdgeCase[] = [];
  const parameters = concreteParameters(entry.operation);
  const validationStatus = expectedClientErrorStatus(entry.operation, [400, 422], 400);

  for (const parameter of parameters) {
    if (!parameter.required || parameter.in === 'cookie') {
      continue;
    }

    if (parameter.in === 'query') {
      cases.push({
        title: `${operationLabel(entry)} rejects missing required query parameter ${parameter.name}`,
        method: entry.method.toUpperCase(),
        path: entry.path,
        operation: entry.operation,
        expectedStatus: validationStatus,
        omittedQueryParameters: new Set([parameter.name])
      });
    }

    if (parameter.in === 'header') {
      cases.push({
        title: `${operationLabel(entry)} rejects missing required header ${parameter.name}`,
        method: entry.method.toUpperCase(),
        path: entry.path,
        operation: entry.operation,
        expectedStatus: validationStatus,
        omittedHeaderParameters: new Set([parameter.name])
      });
    }
  }

  for (const parameter of parameters) {
    if (parameter.in !== 'path' && parameter.in !== 'query' && parameter.in !== 'header') {
      continue;
    }

    const invalidValue = invalidValueForSchema(parameter.schema);
    if (invalidValue === undefined) {
      continue;
    }

    cases.push({
      title: `${operationLabel(entry)} rejects invalid ${parameter.in} parameter ${parameter.name}`,
      method: entry.method.toUpperCase(),
      path: entry.path,
      operation: entry.operation,
      expectedStatus: validationStatus,
      pathOverrides: parameter.in === 'path' ? { [parameter.name]: invalidValue } : undefined,
      queryOverrides: parameter.in === 'query' ? { [parameter.name]: invalidValue } : undefined,
      headerOverrides: parameter.in === 'header' ? { [parameter.name]: invalidValue } : undefined
    });
  }

  if (entry.operation.requestBody?.required) {
    cases.push({
      title: `${operationLabel(entry)} rejects missing required request body`,
      method: entry.method.toUpperCase(),
      path: entry.path,
      operation: entry.operation,
      expectedStatus: validationStatus,
      omitBody: true
    });
  }

  const invalidBodyCase = invalidJsonBodyCase(entry, validationStatus);
  if (invalidBodyCase) {
    cases.push(invalidBodyCase);
  }

  if (operationRequiresAuth(specDocument, entry.operation)) {
    cases.push({
      title: `${operationLabel(entry)} rejects missing authentication`,
      method: entry.method.toUpperCase(),
      path: entry.path,
      operation: entry.operation,
      expectedStatus: expectedClientErrorStatus(entry.operation, [401, 403], 401)
    });
  }

  return cases;
}

function invalidJsonBodyCase(entry: OperationEntry, expectedStatus: number): EdgeCase | undefined {
  const media = selectRequestJsonMedia(entry.operation);
  if (!media) {
    return undefined;
  }

  const schema = mergedSchema(media.schema);
  const validBody = requestBodyExampleOrSample(entry.operation);

  if (isPlainObject(validBody) && schema?.required?.length) {
    const missingProperty = schema.required.find((property) => property in validBody);
    if (missingProperty) {
      const body = { ...validBody };
      delete body[missingProperty];

      return {
        title: `${operationLabel(entry)} rejects request body missing ${missingProperty}`,
        method: entry.method.toUpperCase(),
        path: entry.path,
        operation: entry.operation,
        expectedStatus,
        body
      };
    }
  }

  const invalidProperty = firstInvalidBodyProperty(schema, validBody);
  if (invalidProperty) {
    return {
      title: `${operationLabel(entry)} rejects invalid request body property ${invalidProperty.name}`,
      method: entry.method.toUpperCase(),
      path: entry.path,
      operation: entry.operation,
      expectedStatus,
      body: invalidProperty.body
    };
  }

  if (validBody !== undefined) {
    return {
      title: `${operationLabel(entry)} rejects malformed request body shape`,
      method: entry.method.toUpperCase(),
      path: entry.path,
      operation: entry.operation,
      expectedStatus,
      body: Array.isArray(validBody) ? { invalid: true } : ['invalid-body-shape']
    };
  }

  return undefined;
}

function firstInvalidBodyProperty(
  schema: OpenApiSchema | undefined,
  validBody: unknown
): { name: string; body: Record<string, unknown> } | undefined {
  if (!schema?.properties || !isPlainObject(validBody)) {
    return undefined;
  }

  for (const [name, propertySchema] of Object.entries(schema.properties)) {
    if (!(name in validBody)) {
      continue;
    }

    const invalidValue = invalidValueForSchema(propertySchema);
    if (invalidValue === undefined) {
      continue;
    }

    return {
      name,
      body: {
        ...validBody,
        [name]: invalidValue
      }
    };
  }

  return undefined;
}

function buildTestBlock(edgeCase: EdgeCase): string {
  const url = buildRequestUrl(edgeCase);
  const options = buildRequestOptions(edgeCase);

  return `  test(${JSON.stringify(edgeCase.title)}, async ({ request }) => {
    const response = await request.fetch(${JSON.stringify(url)}, ${options});

    expect(response.status()).toBe(${edgeCase.expectedStatus});
  });`;
}

function buildRequestUrl(edgeCase: EdgeCase): string {
  const operation = edgeCase.operation;
  const parameters = operation ? concreteParameters(operation) : [];
  const path = edgeCase.path.replace(/{([^}]+)}/g, (_, name: string) => {
    const value =
      edgeCase.pathOverrides?.[name] ??
      parameterSample(parameters.find((parameter) => parameter.in === 'path' && parameter.name === name)) ??
      `sample-${name}`;
    return encodeURIComponent(String(value));
  });

  const searchParams = new URLSearchParams();
  for (const parameter of parameters.filter((candidate) => candidate.in === 'query')) {
    if (edgeCase.omittedQueryParameters?.has(parameter.name)) {
      continue;
    }

    appendSearchParam(searchParams, parameter.name, edgeCase.queryOverrides?.[parameter.name] ?? parameterSample(parameter));
  }

  for (const [name, value] of Object.entries(edgeCase.queryOverrides ?? {})) {
    if (!searchParams.has(name)) {
      appendSearchParam(searchParams, name, value);
    }
  }

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

function buildRequestOptions(edgeCase: EdgeCase): string {
  const optionLines = [`method: ${JSON.stringify(edgeCase.method)}`];
  const headers = buildHeaders(edgeCase);
  const body = edgeCase.omitBody ? undefined : edgeCase.body ?? requestBodyExampleOrSample(edgeCase.operation);

  if (Object.keys(headers).length > 0) {
    optionLines.push(`headers: ${indentObject(headers, 6)}`);
  }

  if (body !== undefined) {
    optionLines.push(`data: ${indentObject(body, 6)}`);
  }

  return `{\n      ${optionLines.join(',\n      ')}\n    }`;
}

function buildHeaders(edgeCase: EdgeCase): Record<string, string> {
  const headers: Record<string, string> = {};
  const operation = edgeCase.operation;
  if (!operation) {
    return headers;
  }

  for (const parameter of concreteParameters(operation).filter((candidate) => candidate.in === 'header')) {
    if (edgeCase.omittedHeaderParameters?.has(parameter.name)) {
      continue;
    }

    headers[parameter.name] = String(edgeCase.headerOverrides?.[parameter.name] ?? parameterSample(parameter));
  }

  return headers;
}

function expectedClientErrorStatus(operation: Operation, preferredStatuses: number[], fallback: number): number {
  const documentedStatuses = Object.keys(operation.responses ?? {})
    .filter((status) => /^4\d\d$/.test(status))
    .map(Number)
    .sort((left, right) => left - right);

  for (const preferred of preferredStatuses) {
    if (documentedStatuses.includes(preferred)) {
      return preferred;
    }
  }

  return documentedStatuses[0] ?? fallback;
}

function operationRequiresAuth(specDocument: OpenApiSpec, operation: Operation): boolean {
  const security = Array.isArray(operation.security) ? operation.security : specDocument.security ?? [];
  return security.some((requirement) => Object.keys(requirement).length > 0);
}

function requestBodyExampleOrSample(operation?: Operation): unknown {
  if (!operation) {
    return undefined;
  }

  const example = selectRequestJsonExample(operation);
  if (example !== undefined) {
    return example;
  }

  return sampleValueForSchema(selectRequestJsonMedia(operation)?.schema, 'body');
}

function parameterSample(parameter?: Parameter): unknown {
  return parameter ? sampleParameterValue(parameter) : undefined;
}

function appendSearchParam(searchParams: URLSearchParams, name: string, value: unknown): void {
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      searchParams.append(name, String(item));
    }
    return;
  }

  searchParams.set(name, String(value));
}

function sampleValueForSchema(schema: OpenApiSchema | undefined, propertyName: string): unknown {
  const normalizedSchema = mergedSchema(schema);

  if (!normalizedSchema) {
    return undefined;
  }

  if (normalizedSchema.example !== undefined) {
    return normalizedSchema.example;
  }

  if (normalizedSchema.default !== undefined) {
    return normalizedSchema.default;
  }

  if (normalizedSchema.enum?.length) {
    return normalizedSchema.enum[0];
  }

  if (normalizedSchema.properties) {
    return sampleObjectForSchema(normalizedSchema);
  }

  if (normalizedSchema.items) {
    return [sampleValueForSchema(normalizedSchema.items, propertyName) ?? `sample-${propertyName}`];
  }

  switch (normalizedSchema.type) {
    case 'integer':
    case 'number':
      return normalizedSchema.minimum ?? 1;
    case 'boolean':
      return true;
    case 'array':
      return [sampleValueForSchema(normalizedSchema.items, propertyName) ?? `sample-${propertyName}`];
    case 'object':
      return sampleObjectForSchema(normalizedSchema);
    case 'string':
    default:
      return sampleStringForSchema(normalizedSchema, propertyName);
  }
}

function sampleObjectForSchema(schema: OpenApiSchema): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  const properties = schema.properties ?? {};
  const required = schema.required ?? Object.keys(properties);

  for (const propertyName of required) {
    body[propertyName] = sampleValueForSchema(properties[propertyName], propertyName) ?? `sample-${propertyName}`;
  }

  return body;
}

function sampleStringForSchema(schema: OpenApiSchema, propertyName: string): string {
  switch (schema.format) {
    case 'date':
      return '2024-01-01';
    case 'date-time':
      return '2024-01-01T00:00:00Z';
    case 'uuid':
      return '00000000-0000-4000-8000-000000000000';
    case 'email':
      return 'learner@example.com';
    case 'uri':
      return 'https://example.com';
    default:
      return 'sample';
  }
}

function invalidValueForSchema(schema: OpenApiSchema | undefined): unknown {
  const normalizedSchema = mergedSchema(schema);

  if (!normalizedSchema) {
    return undefined;
  }

  if (normalizedSchema.enum?.length) {
    return '__invalid_enum_value__';
  }

  if (normalizedSchema.properties) {
    return 'not-an-object';
  }

  if (normalizedSchema.items) {
    return 'not-an-array';
  }

  switch (normalizedSchema.type) {
    case 'integer':
      return normalizedSchema.minimum !== undefined ? normalizedSchema.minimum - 1 : 'not-an-integer';
    case 'number':
      return normalizedSchema.minimum !== undefined ? normalizedSchema.minimum - 1 : 'not-a-number';
    case 'boolean':
      return 'not-a-boolean';
    case 'array':
      return 'not-an-array';
    case 'object':
      return 'not-an-object';
    case 'string':
      if (normalizedSchema.minLength && normalizedSchema.minLength > 0) {
        return '';
      }
      if (normalizedSchema.maxLength !== undefined) {
        return 'x'.repeat(normalizedSchema.maxLength + 1);
      }
      if (normalizedSchema.pattern) {
        return '__invalid_pattern_value__';
      }
      if (normalizedSchema.format === 'date') {
        return 'not-a-date';
      }
      if (normalizedSchema.format === 'date-time') {
        return 'not-a-date-time';
      }
      if (normalizedSchema.format === 'uuid') {
        return 'not-a-uuid';
      }
      if (normalizedSchema.format === 'email') {
        return 'not-an-email';
      }
      if (normalizedSchema.format === 'uri') {
        return 'not-a-uri';
      }
      return undefined;
    default:
      return undefined;
  }
}

function mergedSchema(schema: OpenApiSchema | undefined): OpenApiSchema | undefined {
  if (!schema?.allOf?.length) {
    return schema;
  }

  return schema.allOf.reduce<OpenApiSchema>(
    (merged, item) => ({
      ...merged,
      ...item,
      required: [...(merged.required ?? []), ...(item.required ?? [])],
      properties: {
        ...(merged.properties ?? {}),
        ...(item.properties ?? {})
      }
    }),
    {}
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function indentObject(value: unknown, spaces: number): string {
  return toTsValue(value)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `${' '.repeat(spaces)}${line}`))
    .join('\n');
}
