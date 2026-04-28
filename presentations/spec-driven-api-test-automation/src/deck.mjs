import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  panel,
  text,
  image,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
  auto
} = await import('@oai/artifact-tool');

const ROOT = resolve('.');
const OUT = resolve('output/output.pptx');
const PREVIEW_DIR = resolve('scratch/previews');
const ASSET_DIR = resolve('scratch/assets');

const W = 1920;
const H = 1080;

const colors = {
  ink: '#172033',
  muted: '#596579',
  canvas: '#F7F3EA',
  cream: '#FFF9ED',
  dark: '#111827',
  green: '#65B32E',
  greenDark: '#2F7D32',
  blue: '#2563EB',
  cyan: '#2DD4BF',
  orange: '#F97316',
  yellow: '#FACC15',
  line: '#D6CAB7',
  codeBg: '#111827',
  codeFg: '#D1E7FF'
};

const fonts = {
  display: 'DIN Alternate',
  body: 'Avenir Next',
  mono: 'Menlo'
};

const openApiLogo = resolve(ASSET_DIR, 'openapi-logo.png');
const openApiSpecLogo = resolve(ASSET_DIR, 'openapi-specification-logo.png');
const openApiStackedLogo = resolve(ASSET_DIR, 'openapi-logo-stacked.png');

const deck = Presentation.create({
  slideSize: { width: W, height: H }
});

function t(value, opts = {}) {
  return text(value, {
    width: opts.width ?? fill,
    height: opts.height ?? hug,
    style: {
      fontFamily: opts.fontFamily ?? fonts.body,
      fontSize: opts.size ?? 30,
      bold: opts.bold ?? false,
      italic: opts.italic ?? false,
      color: opts.color ?? colors.ink,
      lineSpacing: opts.lineSpacing ?? 1,
      ...opts.style
    },
    name: opts.name,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan
  });
}

function title(value, subtitle, options = {}) {
  return column(
    { name: 'title-stack', width: fill, height: hug, gap: 16 },
    [
      t(value, {
        name: 'slide-title',
        size: options.size ?? 56,
        bold: true,
        color: options.color ?? colors.ink,
        fontFamily: fonts.display,
        width: wrap(options.width ?? 1300),
        lineSpacing: 0.98
      }),
      subtitle
        ? t(subtitle, {
            name: 'slide-subtitle',
            size: 25,
            color: options.subtitleColor ?? colors.muted,
            width: wrap(options.subtitleWidth ?? 1180),
            lineSpacing: 1.15
          })
        : rule({ name: 'title-rule', width: fixed(180), stroke: options.ruleColor ?? colors.green, weight: 5 })
    ].filter(Boolean)
  );
}

function shell(slide, children, opts = {}) {
  slide.compose(
    panel(
      { name: 'slide-bg', width: fill, height: fill, fill: opts.bg ?? colors.canvas },
      column(
        {
          name: 'slide-root',
          width: fill,
          height: fill,
          padding: opts.padding ?? { x: 86, y: 56 },
          gap: opts.gap ?? 34
        },
        children
      )
    ),
    {
      frame: { left: 0, top: 0, width: W, height: H },
      baseUnit: 8
    }
  );
}

function imageAsset(path) {
  return `data:image/png;base64,${readFileSync(path).toString('base64')}`;
}

function codeBlock(lines, opts = {}) {
  return panel(
    {
      name: opts.name ?? 'code-block',
      width: opts.width ?? fill,
      height: opts.height ?? hug,
      fill: opts.fill ?? colors.codeBg,
      borderRadius: 20,
      padding: { x: 28, y: 24 }
    },
    t(Array.isArray(lines) ? lines.join('\n') : lines, {
      width: opts.textWidth ?? fill,
      size: opts.size ?? 22,
      color: opts.color ?? colors.codeFg,
      fontFamily: fonts.mono,
      lineSpacing: 1.18
    })
  );
}

function pill(label, color = colors.green, width = 210) {
  return panel(
    {
      name: `pill-${label}`,
      width: fixed(width),
      height: fixed(54),
      fill: color,
      borderRadius: 'rounded-full',
      padding: { x: 18, y: 12 },
      align: 'center',
      justify: 'center'
    },
    t(label, { size: 21, bold: true, color: '#FFFFFF', width: fill, style: { align: 'center' } })
  );
}

function step(label, detail, accent = colors.green, width = 250) {
  return column(
    { name: `step-${label}`, width: fixed(width), height: hug, gap: 10, align: 'center' },
    [
      panel(
        {
          width: fixed(width),
          height: fixed(94),
          fill: '#FFFFFF',
          borderRadius: 24,
          padding: { x: 18, y: 18 },
          align: 'center',
          justify: 'center'
        },
        t(label, { size: 25, bold: true, color: accent, width: fill, style: { align: 'center' } })
      ),
      t(detail, { size: 18, color: colors.muted, width: wrap(width), style: { align: 'center' }, lineSpacing: 1.1 })
    ]
  );
}

function arrow(color = colors.muted) {
  return t('->', { size: 38, bold: true, color, width: fixed(62), style: { align: 'center' } });
}

function numberedReason(number, heading, body, accent) {
  return row(
    { width: fill, height: hug, gap: 26, align: 'center' },
    [
      t(number, { width: fixed(84), size: 72, bold: true, color: accent, fontFamily: fonts.display }),
      column(
        { name: `reason-${number}`, width: fill, height: fixed(124), gap: 8, justify: 'center' },
        [
          t(heading, { size: 34, bold: true, color: colors.ink }),
          t(body, { size: 24, color: colors.muted, width: wrap(1220), lineSpacing: 1.06 })
        ]
      )
    ]
  );
}

function footer(label = 'Spec-driven API test automation learning project') {
  return t(label, { size: 14, color: '#8B7D68', width: fill });
}

function homeworkCard(titleText, url, bestFor, task, accent) {
  return panel(
    {
      name: `homework-${titleText}`,
      width: fill,
      height: fixed(360),
      fill: '#FFFFFF',
      borderRadius: 26,
      padding: { x: 28, y: 26 }
    },
    column(
      { width: fill, height: fill, gap: 14 },
      [
        t(titleText, { size: 31, bold: true, color: accent, fontFamily: fonts.display, width: fill }),
        t(url, { size: 17, color: colors.muted, fontFamily: fonts.mono, width: fill }),
        rule({ width: fill, stroke: colors.line, weight: 2 }),
        t(bestFor, { size: 22, bold: true, color: colors.ink, width: fill, lineSpacing: 1.08 }),
        t(task, { size: 22, color: colors.muted, width: fill, lineSpacing: 1.12 })
      ]
    )
  );
}

function addSlide(build) {
  const slide = deck.slides.add();
  build(slide);
}

addSlide((slide) => {
  slide.compose(
    panel(
      { name: 'cover-bg', width: fill, height: fill, fill: colors.dark },
      grid(
        {
          name: 'cover-grid',
          width: fill,
          height: fill,
          columns: [fr(1.2), fr(0.8)],
          rows: [fr(1)],
          padding: { x: 92, y: 76 },
          columnGap: 74
        },
        [
          column(
            { width: fill, height: fill, gap: 32, justify: 'center' },
            [
              pill('TEACHING DECK', colors.green, 260),
              t('Spec-Driven\nAPI Test\nAutomation', {
                name: 'cover-title',
                size: 96,
                bold: true,
                color: '#FFFFFF',
                fontFamily: fonts.display,
                width: wrap(860),
                lineSpacing: 0.92
              }),
              t('Given an OpenAPI spec, generate executable Playwright API tests.', {
                size: 32,
                color: '#D6F2C8',
                width: wrap(820),
                lineSpacing: 1.12
              }),
              row(
                { width: fill, height: hug, gap: 18, align: 'center' },
                [
                  t('spec in', { size: 28, bold: true, color: colors.cyan, width: hug }),
                  arrow('#CBD5E1'),
                  t('tests out', { size: 28, bold: true, color: colors.yellow, width: hug })
                ]
              )
            ]
          ),
          column(
            { width: fill, height: fill, gap: 34, justify: 'center', align: 'center' },
            [
              image({
                name: 'openapi-logo-stacked',
                dataUrl: imageAsset(openApiStackedLogo),
                width: fixed(430),
                height: fixed(430),
                fit: 'contain',
                alt: 'OpenAPI logo'
              }),
              codeBlock(
                [
                  'openapi.yaml',
                  '  -> generate-tests.ts',
                  '  -> openapi.spec.ts',
                  '  -> playwright test'
                ],
                { width: fixed(570), size: 25, fill: '#0B1220' }
              )
            ]
          )
        ]
      )
    ),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 }
  );
});

addSlide((slide) => {
  shell(slide, [
    title('Why generate tests from OpenAPI?', 'Because the spec already contains the contract learners need to verify.'),
    column(
      { width: fill, height: fill, gap: 34, justify: 'center' },
      [
        numberedReason('01', 'The contract is already written', '`paths`, methods, parameters, responses, and examples describe how the API should behave.', colors.green),
        numberedReason('02', 'Repetition moves into codegen', 'The generator writes the boring parts: request calls, status checks, content type checks, and expected bodies.', colors.blue),
        numberedReason('03', 'One source connects teams', 'API, docs, and tests can all point back to the same OpenAPI document.', colors.orange)
      ]
    ),
    footer('Source anchors: Playwright API request fixture; OpenAPI code generation concepts')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Project workflow overview', 'The repo teaches both a local demo loop and the final provided-spec loop.'),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 58 },
      [
        column(
          { width: fill, height: fill, gap: 28 },
          [
            t('Demo path', { size: 38, bold: true, color: colors.greenDark, fontFamily: fonts.display }),
            row(
              { width: fill, height: hug, gap: 12, align: 'center' },
              [
                step('OpenAPI spec', 'sample with examples', colors.green, 220),
                arrow(),
                step('Express API', 'generated routes', colors.green, 220),
                arrow(),
                step('Playwright', 'generated tests', colors.green, 220)
              ]
            ),
            codeBlock(['npm run generate', 'npm test'], { size: 24 })
          ]
        ),
        column(
          { width: fill, height: fill, gap: 28 },
          [
            t('Real API path', { size: 38, bold: true, color: colors.blue, fontFamily: fonts.display }),
            row(
              { width: fill, height: hug, gap: 12, align: 'center' },
              [
                step('Provided spec', 'file or URL', colors.blue, 220),
                arrow(),
                step('Test file', 'generated spec', colors.blue, 220),
                arrow(),
                step('Target API', 'via BASE_URL', colors.blue, 220)
              ]
            ),
            codeBlock(['npm run generate:from-spec -- --spec ./openapi.yaml', 'BASE_URL=https://api.example.com npm run test:generated'], {
              size: 20
            })
          ]
        )
      ]
    ),
    footer()
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Anatomy of the spec', 'The generator reads the fields that can become executable behavior.'),
    grid(
      { width: fill, height: fill, columns: [fr(1.05), fr(0.95)], columnGap: 54 },
      [
        codeBlock(
          [
            'paths:',
            '  /v2:',
            '    get:',
            '      operationId: getVersionDetailsv2',
            '      parameters: [...]',
            '      requestBody:',
            '        content:',
            '          application/json:',
            '            example: {...}',
            '      responses:',
            "        '200':",
            '          content:',
            '            application/json:',
            '              examples:',
            '                foo:',
            '                  value: {...}'
          ],
          { size: 20 }
        ),
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            image({
              dataUrl: imageAsset(openApiSpecLogo),
              width: fixed(190),
              height: fixed(132),
              fit: 'contain',
              alt: 'OpenAPI Specification logo'
            }),
            numberedReason('A', '`paths` + method', 'Produces a candidate operation.', colors.green),
            numberedReason('B', '`parameters` + request examples', 'Builds URL and request body.', colors.blue),
            numberedReason('C', '`responses.2xx.examples`', 'Builds status, content-type, and body assertions.', colors.orange)
          ]
        )
      ]
    ),
    footer('Teaching point: examples create stronger generated tests than schema-only responses.')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Step 1: Load and validate', '`loadSpec()` accepts a local file or URL, parses it, then guards the contract.'),
    row(
      { width: fill, height: fill, gap: 18, align: 'center', justify: 'center' },
      [
        step('file path', './openapi.yaml', colors.green, 230),
        t('or', { size: 30, bold: true, color: colors.muted, width: fixed(58), style: { align: 'center' } }),
        step('HTTP URL', 'https://.../openapi.yaml', colors.green, 270),
        arrow(colors.greenDark),
        step('parse', 'YAML or JSON', colors.blue, 220),
        arrow(colors.greenDark),
        step('guard', 'OpenAPI 3.0.x', colors.orange, 220),
        arrow(colors.greenDark),
        step('ready', 'non-empty paths', colors.greenDark, 220)
      ]
    ),
    codeBlock(
      [
        'const specInput = values.spec ?? process.env.OPENAPI_SPEC',
        'const spec = await loadSpec(specInput)',
        '',
        "if (!document.openapi?.startsWith('3.0.')) throw new Error(...)",
        'if (!document.paths || Object.keys(document.paths).length === 0) throw new Error(...)'
      ],
      { size: 21 }
    ),
    footer('Fail early when the source contract cannot produce reliable tests.')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Step 2: Discover operations', '`listOperations()` walks every path and supported HTTP method.'),
    grid(
      { width: fill, height: fill, columns: [fr(0.9), fr(1.1)], columnGap: 48 },
      [
        codeBlock(
          [
            "HTTP_METHODS = [",
            "  'get', 'post', 'put',",
            "  'patch', 'delete',",
            "  'head', 'options'",
            ']',
            '',
            'for each path:',
            '  for each method:',
            '    if operation exists:',
            '      add candidate'
          ],
          { size: 23 }
        ),
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            t('Candidate test names', { size: 38, bold: true, color: colors.ink, fontFamily: fonts.display }),
            panel({ width: fill, height: hug, fill: '#FFFFFF', borderRadius: 24, padding: { x: 34, y: 28 } }, column({ gap: 22, width: fill }, [
              t('GET / listVersionsv2', { size: 34, bold: true, color: colors.greenDark, fontFamily: fonts.mono }),
              t('GET /v2 getVersionDetailsv2', { size: 34, bold: true, color: colors.blue, fontFamily: fonts.mono })
            ])),
            t('Each operation becomes a candidate. It only emits a test if a 2xx response exists.', {
              size: 26,
              color: colors.muted,
              width: wrap(720)
            })
          ]
        )
      ]
    ),
    footer()
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Step 3: Build the request', 'OpenAPI examples and defaults become a concrete Playwright request.'),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(0.12), fr(1)], columnGap: 24 },
      [
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            numberedReason('1', 'Path params', 'Use parameter examples, schema examples, defaults, or `sample-name`.', colors.green),
            numberedReason('2', 'Query params', 'Append concrete values through `URLSearchParams`.', colors.blue),
            numberedReason('3', 'Request body', 'JSON examples become Playwright `{ data: ... }`.', colors.orange)
          ]
        ),
        column({ width: fill, height: fill, justify: 'center', align: 'center' }, [arrow(colors.greenDark)]),
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            codeBlock(
              [
                "const response = await request.get('/v2')",
                '',
                "const created = await request.post('/users', {",
                '  data: {',
                "    name: 'Ada'",
                '  }',
                '})'
              ],
              { size: 25 }
            ),
            t('The generated request uses Playwright Test\'s built-in `request` fixture, so no browser page is needed.', {
              size: 25,
              color: colors.muted,
              width: wrap(700)
            })
          ]
        )
      ]
    ),
    footer('Playwright API tests can call GET, POST, PUT, PATCH, DELETE, HEAD, and fetch-style requests directly.')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Step 4: Build the assertions', 'The first 2xx response contract decides how rich the generated test can be.'),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 52 },
      [
        column(
          { width: fill, height: fill, gap: 18, justify: 'center' },
          [
            step('2xx response?', 'otherwise skip operation', colors.green, 320),
            arrow(colors.greenDark),
            step('JSON content?', 'assert content-type when present', colors.blue, 320),
            arrow(colors.greenDark),
            step('example body?', 'assert exact JSON body', colors.orange, 320)
          ]
        ),
        column(
          { width: fill, height: fill, gap: 22, justify: 'center' },
          [
            codeBlock(
              [
                'expect(response.status()).toBe(200)',
                '',
                "expect(response.headers()['content-type'])",
                "  .toContain('application/json')",
                '',
                'const body = await response.json()',
                'expect(body).toEqual(expectedExample)'
              ],
              { size: 24 }
            ),
            t('Schema-only responses still produce status checks. Examples unlock full body assertions.', {
              size: 26,
              color: colors.muted,
              width: wrap(760)
            })
          ]
        )
      ]
    ),
    footer('Implementation anchor: selectSuccessResponseContract() in scripts/lib/openapi.ts')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Step 5: Emit the test file', 'The output is a normal Playwright spec file that can be reviewed, committed, and run.'),
    grid(
      { width: fill, height: fill, columns: [fr(0.9), fr(1.1)], columnGap: 48 },
      [
        column(
          { width: fill, height: fill, gap: 30, justify: 'center' },
          [
            image({
              dataUrl: imageAsset(openApiLogo),
              width: fixed(420),
              height: fixed(130),
              fit: 'contain',
              alt: 'OpenAPI logo'
            }),
            row({ width: fill, height: hug, gap: 12, align: 'center' }, [
              step('operation', 'GET /v2', colors.green, 220),
              arrow(),
              step('test()', 'one generated case', colors.blue, 250)
            ]),
            t('Generated file: `tests/generated/openapi.spec.ts`', {
              size: 28,
              bold: true,
              color: colors.ink,
              width: wrap(720)
            })
          ]
        ),
        codeBlock(
          [
            "import { expect, test } from '@playwright/test'",
            '',
            "test.describe('OpenAPI generated contract examples', () => {",
            "  test('GET /v2 getVersionDetailsv2 returns 200', async ({ request }) => {",
            "    const response = await request.get('/v2')",
            '    expect(response.status()).toBe(200)',
            '    const body = await response.json()',
            '    expect(body).toEqual({...})',
            '  })',
            '})'
          ],
          { size: 18 }
        )
      ]
    ),
    footer()
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Run against the demo API', '`npm test` proves the whole learning loop end to end.'),
    row(
      { width: fill, height: fill, gap: 16, align: 'center', justify: 'center' },
      [
        step('npm test', 'single command', colors.green, 220),
        arrow(),
        step('generate', 'routes + tests', colors.blue, 220),
        arrow(),
        step('webServer', 'starts Express', colors.orange, 220),
        arrow(),
        step('request fixture', 'calls the API', colors.greenDark, 240),
        arrow(),
        step('assertions pass', 'contract holds', colors.green, 240)
      ]
    ),
    codeBlock(
      [
        '> npm test',
        'Generated 2 API routes',
        'Generated 2 Playwright API tests',
        'API server listening at http://127.0.0.1:3774',
        '2 passed'
      ],
      { size: 25 }
    ),
    footer('Playwright webServer handles local startup, so learners do not need a second terminal.')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Provided API mode', '`BASE_URL` switches generated tests from demo mode to target-API mode.'),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 54 },
      [
        column(
          { width: fill, height: fill, gap: 22, justify: 'center' },
          [
            t('1. Generate from any spec', { size: 36, bold: true, fontFamily: fonts.display, color: colors.greenDark }),
            codeBlock(
              [
                'npm run generate:from-spec -- \\',
                '  --spec ./path/to/openapi.yaml \\',
                '  --output tests/generated/openapi.spec.ts'
              ],
              { size: 22 }
            ),
            t('The input can be a local YAML/JSON file or an HTTP(S) URL.', { size: 25, color: colors.muted, width: wrap(720) })
          ]
        ),
        column(
          { width: fill, height: fill, gap: 22, justify: 'center' },
          [
            t('2. Run against the target', { size: 36, bold: true, fontFamily: fonts.display, color: colors.blue }),
            codeBlock(
              [
                'BASE_URL=https://api.example.com \\',
                '  npm run test:generated'
              ],
              { size: 25 }
            ),
            row({ width: fill, height: hug, gap: 14, align: 'center' }, [
              pill('BASE_URL set', colors.blue, 250),
              t('Playwright skips local server startup.', { size: 24, color: colors.muted, width: wrap(520) })
            ])
          ]
        )
      ]
    ),
    footer()
  ]);
});

addSlide((slide) => {
  shell(slide, [
    title('Limits and next improvements', 'The current generator is intentionally teachable. The next upgrades are clear.'),
    grid(
      { width: fill, height: fill, columns: [fr(1), fr(1)], columnGap: 60 },
      [
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            t('Current limits', { size: 42, bold: true, fontFamily: fonts.display, color: colors.orange }),
            numberedReason('L1', '$ref parameters', 'Not expanded yet.', colors.orange),
            numberedReason('L2', 'Schema-only bodies', 'Produce status-only tests.', colors.orange),
            numberedReason('L3', 'Auth', 'Configured separately in Playwright.', colors.orange)
          ]
        ),
        column(
          { width: fill, height: fill, gap: 24, justify: 'center' },
          [
            t('Upgrade path', { size: 42, bold: true, fontFamily: fonts.display, color: colors.greenDark }),
            row({ width: fill, height: hug, gap: 12, align: 'center' }, [
              step('Edit spec', 'examples + schemas', colors.green, 180),
              arrow(),
              step('Generate', 'tests refresh', colors.blue, 180),
              arrow(),
              step('Run', 'contract checks', colors.greenDark, 180)
            ]),
            rule({ width: fixed(620), stroke: colors.line, weight: 3 }),
            t('Next: schema validation, negative tests, auth profiles, multi-example generation, and CI.', {
              size: 29,
              color: colors.ink,
              width: wrap(720),
              lineSpacing: 1.12
            })
          ]
        )
      ]
    ),
    footer('Close the loop: spec changes should regenerate executable evidence.')
  ]);
});

addSlide((slide) => {
  shell(slide, [
    column(
      { name: 'homework-title-stack', width: fill, height: hug, gap: 16 },
      [
        t('Homework', {
          name: 'homework-title',
          size: 72,
          bold: true,
          color: colors.ink,
          fontFamily: fonts.body,
          width: fixed(820),
          lineSpacing: 0.94
        }),
        t('Explore public test APIs: read docs, write Playwright tests, run them.', {
          name: 'homework-subtitle',
          size: 29,
          color: colors.muted,
          width: wrap(1500),
          lineSpacing: 1.12
        })
      ]
    ),
    row(
      { width: fill, height: hug, gap: 14, align: 'center', justify: 'center' },
      [
        step('Read docs', 'understand endpoints', colors.green, 240),
        arrow(),
        step('Write tests', 'use request fixture', colors.blue, 240),
        arrow(),
        step('Run tests', 'inspect behavior', colors.orange, 240)
      ]
    ),
    grid(
      { width: fill, height: fixed(390), columns: [fr(1), fr(1), fr(1)], columnGap: 26 },
      [
        homeworkCard(
          'Swagger Petstore',
          'petstore.swagger.io',
          'Best for: OpenAPI basics and tooling compatibility.',
          'Cover at least one GET and one POST using the Swagger UI spec.',
          colors.greenDark
        ),
        homeworkCard(
          'Restful-Booker',
          'restful-booker.herokuapp.com',
          'Best for: CRUD flows, auth, and bug discovery.',
          'Authenticate, then create, retrieve, and delete a booking.',
          colors.blue
        ),
        homeworkCard(
          'Beeceptor Samples',
          'beeceptor.com/docs/sample-api-for-testing',
          'Best for: quick JSON response prototyping.',
          'Pick one sample API and validate its responses with Playwright.',
          colors.orange
        )
      ]
    ),
    footer('Homework source: homework.md')
  ]);
});

mkdirSync(dirname(OUT), { recursive: true });
mkdirSync(PREVIEW_DIR, { recursive: true });

const pptx = await PresentationFile.exportPptx(deck);
await pptx.save(OUT);

for (let i = 0; i < deck.slides.count; i += 1) {
  const slide = deck.slides.getItem(i);
  const png = await slide.export({ format: 'png' });
  const file = resolve(PREVIEW_DIR, `slide-${String(i + 1).padStart(2, '0')}.png`);
  writeFileSync(file, Buffer.from(await png.arrayBuffer()));
}

console.log(JSON.stringify({
  pptx: OUT,
  previews: PREVIEW_DIR,
  slides: deck.slides.count,
  root: ROOT
}, null, 2));
