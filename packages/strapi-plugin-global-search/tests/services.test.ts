/**
 * Exercises the global-search plugin services against a fake Strapi instance.
 * No Strapi boot, no database, no test runner: `npm test` (tsx).
 */
import assert from "assert";

import {
  contentTypes,
  isHomepageOnly,
  mkCt,
  services,
  strapi,
} from "./testFixtures";

const run = async () => {
  let failures = 0;
  const check = (label: string, fn: () => void) => {
    try {
      fn();
      console.log(`  PASS  ${label}`);
    } catch (error) {
      failures += 1;
      console.log(`  FAIL  ${label}\n        ${(error as Error).message}`);
    }
  };
  const checkEq = (label: string, actual: unknown, expected: unknown) =>
    check(label, () => assert.strictEqual(actual, expected));

  console.log("\n== schema introspection ==");
  const types = await services.schema.getSearchableContentTypes();
  const findType = (uid: string) =>
    types.find((t: { uid: string }) => t.uid === uid);
  const article = findType("api::article.article");
  const homepage = findType("api::homepage.homepage");

  checkEq("discovers collection + single types", types.length, 3);
  check("types with no text fields remain searchable by documentId", () =>
    assert.ok(findType("api::secret.secret"))
  );
  checkEq(
    "resolves mainField from content-manager config",
    article.mainField,
    "title"
  );
  checkEq("detects single type kind", homepage.kind, "singleType");
  check("detects i18n + draft&publish", () =>
    assert.ok(article.localized && article.draftAndPublish)
  );
  check("collects id fields including documentId", () =>
    assert.deepStrictEqual(article.idFields, ["documentId", "slug"])
  );
  check("collects top-level string fields, minus mainField/id fields", () =>
    assert.deepStrictEqual(article.topLevelFields.sort(), ["body"])
  );
  check("skips media/relation/json/dynamiczone/private/password", () => {
    const all = [...article.topLevelFields, ...article.nestedFields].join(",");
    for (const name of "cover,author,payload,secret,password,zone,views".split(
      ","
    )) {
      assert.ok(!all.includes(name), `${name} should not be searchable`);
    }
  });
  check("walks into components (depth 1 + 2)", () => {
    assert.ok(article.nestedFields.includes("seo.metaTitle"));
    assert.ok(article.nestedFields.includes("seo.social.handle"));
    assert.ok(article.nestedFields.includes("tags.label"));
  });
  check("breaks component cycles instead of hanging", () =>
    assert.ok(
      !article.nestedFields.some((p: string) => p.split(".").length > 4)
    )
  );

  console.log("\n== query builder ==");
  const filtersText = services.query.buildFilters(article, "careers");
  const filtersNumeric = services.query.buildFilters(article, "42");

  check("always matches documentId as a string", () =>
    assert.deepStrictEqual(filtersText.$or[0], {
      documentId: { $containsi: "careers" },
    })
  );
  check("no $eq on numeric id for a text query", () =>
    assert.ok(!JSON.stringify(filtersText).includes('"$eq"'))
  );
  check("adds id $eq for a numeric query", () =>
    assert.ok(filtersNumeric.$or.some((c: any) => c.id?.$eq === 42))
  );
  check("nests component paths", () =>
    assert.ok(
      filtersText.$or.some(
        (c: any) => c.seo?.social?.handle?.$containsi === "careers"
      )
    )
  );
  check("builds a nested populate tree only for searched components", () => {
    const populate = services.query.buildPopulate([
      "seo.metaTitle",
      "seo.social.handle",
      "tags.label",
    ]);
    assert.deepStrictEqual(populate, {
      seo: { populate: { social: true } },
      tags: true,
    });
  });

  const params = services.query.buildParams(article, {
    query: "careers",
    locale: "all",
    limit: 20,
    includeDrafts: true,
  });
  check("projects a bounded field list (no populate: *)", () => {
    assert.ok(
      params.fields.includes("title") && params.fields.includes("publishedAt")
    );
    assert.ok(!params.fields.includes("id"));
  });
  check("passes status + locale for i18n/D&P types", () => {
    assert.strictEqual(params.status, "draft");
    assert.strictEqual(params.locale, "*");
  });
  check("omits locale/status for plain types", () => {
    const plain = services.query.buildParams(homepage, {
      query: "x",
      limit: 5,
      includeDrafts: true,
    });
    assert.ok(!("locale" in plain) && !("status" in plain));
  });

  console.log("\n== ranking ==");
  const tier = (entry: unknown) =>
    services.ranking.score(entry, article, "careers").tier;
  checkEq("id exact beats everything", tier({ id: 7, slug: "careers" }), 0);
  checkEq("name exact -> tier 2", tier({ id: 1, title: "Careers" }), 2);
  checkEq(
    "name starts-with -> tier 3",
    tier({ id: 1, title: "Careers page" }),
    3
  );
  checkEq("name contains -> tier 4", tier({ id: 1, title: "Our careers" }), 4);
  checkEq(
    "other field -> tier 5",
    tier({ id: 1, title: "x", body: "see careers" }),
    5
  );
  checkEq(
    "nested component field -> tier 6",
    tier({ id: 1, title: "x", seo: { metaTitle: "careers" } }),
    6
  );
  checkEq(
    "repeatable component values are reachable",
    tier({ id: 1, title: "x", tags: [{ label: "no" }, { label: "careers" }] }),
    6
  );
  check("snippet is extracted and de-marked-up", () => {
    const scored = services.ranking.score(
      { id: 1, title: "x", body: "<p>we are hiring for careers now</p>" },
      article,
      "careers"
    );
    assert.ok(scored.matchedSnippet.includes("careers"));
    assert.ok(!scored.matchedSnippet.includes("<p>"));
    assert.strictEqual(scored.matchedFieldLabel, "Body");
  });

  console.log("\n== search end to end ==");
  const result = await services.search.search({
    query: "careers",
    pageSize: 10,
  });
  const order = result.results.map(
    (h: any) => `${h.contentTypeUid}#${h.id}:${h.tierLabel}`
  );
  console.log("  order:", order.join("\n         "));

  check("ranks id > name-exact > starts-with > contains > field > nested", () =>
    assert.deepStrictEqual(
      result.results.map((h: any) => h.tier),
      result.results
        .map((h: any) => h.tier)
        .sort((a: number, b: number) => a - b)
    )
  );
  checkEq('slug "careers" wins the top spot', result.results[0].id, 7);
  check("single type is included and linked correctly", () => {
    const single = result.results.find((h: any) => h.kind === "singleType");
    assert.ok(single, "homepage single type missing");
    assert.strictEqual(
      single.adminUrl,
      "/content-manager/single-types/api::homepage.homepage"
    );
  });
  checkEq(
    "collection links use documentId and locale",
    result.results.find((h: any) => h.id === 7).adminUrl,
    "/content-manager/collection-types/api::article.article/" +
      "doc-careers?locale=en"
  );
  checkEq(
    "draft/published status is reported",
    result.results.find((h: any) => h.id === 12).status,
    "draft"
  );
  checkEq(
    "groups summarise per content type",
    result.groups.reduce((sum: number, g: any) => sum + g.count, 0),
    result.pagination.total
  );

  const short = await services.search.search({ query: "a" });
  checkEq("queries below minChars return nothing", short.results.length, 0);

  const wildcard = await services.search.search({ query: "%%%%" });
  checkEq(
    "a bare wildcard query cannot match everything",
    wildcard.results.length,
    0
  );

  const denied = await services.search.search({
    query: "careers",
    userAbility: {
      can: (_action: string, uid: string) => uid === "api::homepage.homepage",
    },
  });
  check("RBAC filter hides content types the user cannot read", () =>
    assert.ok(isHomepageOnly(denied))
  );

  const filtered = await services.search.search({
    query: "careers",
    types: ["api::homepage.homepage"],
  });
  check("type filter is honoured", () => assert.ok(isHomepageOnly(filtered)));

  const paged = await services.search.search({
    query: "careers",
    page: 2,
    pageSize: 2,
  });
  check("pagination slices the ranked set", () => {
    assert.strictEqual(paged.pagination.page, 2);
    assert.strictEqual(paged.results.length, 2);
    assert.notStrictEqual(paged.results[0].id, result.results[0].id);
  });

  console.log("\n== resilience ==");
  const originalDocuments = strapi.documents;
  strapi.documents = (uid: string) => ({
    findMany: async (queryParams: unknown) => {
      if (uid === "api::article.article") throw new Error("boom");
      return originalDocuments(uid).findMany(queryParams);
    },
  });
  const partial = await services.search.search({ query: "careers" });
  strapi.documents = originalDocuments;

  check("one broken content type does not fail the whole search", () => {
    assert.ok(partial.results.length > 0);
    assert.strictEqual(partial.meta.failedTypes.length, 1);
  });

  console.log("\n== plugin content types & structured rich text ==");
  Object.assign(contentTypes, {
    "plugin::events.event": mkCt("plugin::events.event", "Event", {
      options: { draftAndPublish: true },
      attributes: {
        title: { type: "string" },
        content: {
          type: "customField",
          customField: "plugin::tiptap-editor.RichText",
        },
      },
    }),
    "plugin::upload.file": mkCt("plugin::upload.file", "File"),
    "plugin::custom.hidden": mkCt("plugin::custom.hidden", "Hidden", {
      pluginOptions: { "content-manager": { visible: false } },
    }),
  });

  services.schema.clearCache();
  const withPlugins = await services.schema.getSearchableContentTypes({
    force: true,
  });
  const eventDescriptor = withPlugins.find(
    (t: { uid: string }) => t.uid === "plugin::events.event"
  );

  check("discovers visible plugin::* types and skips system/hidden", () => {
    assert.ok(eventDescriptor, "plugin::events.event should be discovered");
    assert.ok(!withPlugins.some((t: any) => t.uid === "plugin::upload.file"));
    assert.ok(!withPlugins.some((t: any) => t.uid === "plugin::custom.hidden"));
  });
  check("indexes customField attributes as searchable top-level fields", () =>
    assert.ok(eventDescriptor.topLevelFields.includes("content"))
  );
  check("extracts plain text from ProseMirror/Tiptap JSON", () => {
    const text = "Join our Friday community lecture on careers";
    const content = JSON.stringify({
      doc: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      },
      metrics: { words: 7, readingTimeMinutes: 1 },
    });
    const entry = { id: 101, title: "Weekly Gathering", content };
    const hitScore = services.ranking.score(entry, eventDescriptor, "careers");
    assert.strictEqual(hitScore.tier, 5);
    assert.ok(hitScore.matchedSnippet.includes("lecture on careers"));
    assert.strictEqual(
      services.ranking.score(entry, eventDescriptor, "readingTimeMinutes").tier,
      7
    );
  });
  check("handles 50k unclosed < in linear time and blocks _ wildcards", () => {
    const start = Date.now();
    const scored = services.ranking.score(
      { id: 1, title: "x", body: `${"<".repeat(50_000)} careers` },
      article,
      "careers"
    );
    assert.strictEqual(scored.tier, 5);
    assert.ok(Date.now() - start < 200, "toPlainText must be linear");
  });
  check("guards Postgres INT32 overflow and matches across inline HTML", () => {
    const bigNum = services.query.buildFilters(article, "99999999999999999999");
    assert.ok(!JSON.stringify(bigNum).includes('"$eq"'));
    const htmlEntry = {
      id: 1,
      title: "x",
      body: "<p>we are <strong>hiring</strong> for careers</p>",
    };
    const rankHtml = (q: string) =>
      services.ranking.score(htmlEntry, article, q).tier;
    assert.strictEqual(rankHtml("hiring for careers"), 5);
    assert.strictEqual(rankHtml("strong"), 7);
  });
  const uWildcard = await services.search.search({ query: "____" });
  checkEq("bare _ wildcard returns nothing", uWildcard.results.length, 0);

  strapi.config.get = () => ({
    excludedFields: ["api::article.article:title"],
    displayFields: { "api::article.article": ["password", "secret", "views"] },
  });
  const nextTypes = await services.schema.getSearchableContentTypes({
    force: true,
  });
  const nextArt = nextTypes.find((t: any) => t.uid === "api::article.article");
  check("honors excludedFields on mainField & filters displayFields", () => {
    assert.strictEqual(nextArt.mainFieldSearchable, false);
    assert.deepStrictEqual(nextArt.displayFields, ["views"]);
    assert.ok(!nextArt.topLevelFields.includes("cancelToken"));
  });
  check("fails closed when userAbility is null or invalid", () => {
    assert.deepStrictEqual(
      services.permissions.filterReadableTypes(nextTypes, null),
      []
    );
    assert.deepStrictEqual(
      services.permissions.filterReadableTypes(nextTypes, {} as never),
      []
    );
  });

  console.log(`\n${failures ? `${failures} FAILED` : "ALL CHECKS PASSED"}\n`);
  process.exit(failures === 0 ? 0 : 1);
};

run().catch((error) => {
  console.error("harness crashed:", error);
  process.exit(1);
});
