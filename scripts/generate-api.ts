import { parseArgs } from 'node:util';
import {
  generatedBanner,
  listOperations,
  loadSpec,
  operationLabel,
  selectSuccessJsonExample,
  toExpressPath,
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
const outputPath = values.output ?? positionals[1] ?? process.env.OPENAPI_API_OUTPUT ?? 'src/generated/openapi-router.ts';
const spec = await loadSpec(specInput);

const routeBlocks = listOperations(spec).flatMap((entry) => {
  const example = selectSuccessJsonExample(entry.operation);
  if (!example) {
    return [];
  }

  const expressPath = JSON.stringify(toExpressPath(entry.path));
  const body = toTsValue(example.value)
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n')
    .trimStart();

  return `  router.${entry.method}(${expressPath}, (_req, res) => {
    res.status(${Number(example.status)}).json(${body});
  });`;
});

if (routeBlocks.length === 0) {
  throw new Error(`No 2xx JSON examples were found in ${specInput}`);
}

const contents = `${generatedBanner(specInput, 'scripts/generate-api.ts')}import { Router } from 'express';

export function createOpenApiRouter(): Router {
  const router = Router();

${routeBlocks.join('\n\n')}

  return router;
}
`;

writeGeneratedFile(outputPath, contents);
console.log(`Generated ${routeBlocks.length} API routes from ${specInput} -> ${outputPath}`);
for (const entry of listOperations(spec)) {
  if (selectSuccessJsonExample(entry.operation)) {
    console.log(`- ${operationLabel(entry)}`);
  }
}
