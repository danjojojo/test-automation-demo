import { parseArgs } from 'node:util';
import {
  generatedBanner,
  listOperations,
  loadSpec,
  operationLabel,
  selectRequestJsonExample,
  selectSuccessResponseContract,
  toRequestUrl,
  toTsValue,
  writeGeneratedFile
} from './lib/openapi.js';

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
const outputPath = values.output ?? positionals[1] ?? process.env.OPENAPI_TEST_OUTPUT ?? 'tests/generated/openapi.spec.ts';
const spec = await loadSpec(specInput);

const testBlocks = listOperations(spec).flatMap((entry) => {
  const responseContract = selectSuccessResponseContract(entry.operation);
  if (!responseContract) {
    return [];
  }

  const requestBody = selectRequestJsonExample(entry.operation);
  const requestOptions = requestBody === undefined ? undefined : `{ data: ${toTsValue(requestBody)} }`;
  const requestCall = buildRequestCall(entry.method, toRequestUrl(entry.path, entry.operation), requestOptions);
  const assertions = buildAssertions(responseContract);

  return `  test(${JSON.stringify(`${operationLabel(entry)} returns ${responseContract.status}`)}, async ({ request }) => {
    const response = await ${requestCall};

${assertions}
  });`;
});

if (testBlocks.length === 0) {
  throw new Error(`No 2xx responses were found in ${specInput}`);
}

const contents = `${generatedBanner(specInput, 'scripts/generate-tests.ts')}import { expect, test } from '@playwright/test';

test.describe('OpenAPI generated contract examples', () => {
${testBlocks.join('\n\n')}
});
`;

writeGeneratedFile(outputPath, contents);
console.log(`Generated ${testBlocks.length} Playwright API tests from ${specInput} -> ${outputPath}`);
for (const entry of listOperations(spec)) {
  if (selectSuccessResponseContract(entry.operation)) {
    console.log(`- ${operationLabel(entry)}`);
  }
}

function buildRequestCall(method: string, url: string, requestOptions?: string): string {
  const urlArgument = JSON.stringify(url);
  const directMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'head']);

  if (directMethods.has(method)) {
    return requestOptions ? `request.${method}(${urlArgument}, ${requestOptions})` : `request.${method}(${urlArgument})`;
  }

  const fetchOptions = requestOptions
    ? `{ method: ${JSON.stringify(method.toUpperCase())}, ...${requestOptions} }`
    : `{ method: ${JSON.stringify(method.toUpperCase())} }`;
  return `request.fetch(${urlArgument}, ${fetchOptions})`;
}

function buildAssertions(responseContract: { status: string; mediaType?: string; value?: unknown }): string {
  const lines = [`    expect(response.status()).toBe(${Number(responseContract.status)});`];

  if (responseContract.mediaType) {
    lines.push(`    expect(response.headers()['content-type']).toContain(${JSON.stringify(responseContract.mediaType)});`);
  }

  if (responseContract.value !== undefined) {
    const expectedBody = toTsValue(responseContract.value)
      .split('\n')
      .map((line) => `    ${line}`)
      .join('\n')
      .trimStart();

    lines.push('', '    const body = await response.json();', `    expect(body).toEqual(${expectedBody});`);
  }

  return lines.join('\n');
}
