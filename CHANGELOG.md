# Changelog

## [0.8.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.8...v0.8.0) (2026-06-28)


### Features

* **web:** add reviewable curation dashboard actions ([4a30891](https://github.com/MiguelMedeiros/unforgit/commit/4a308912bfdb640280aa2b2edb76a4ecb7c81481))


### Bug Fixes

* encode remote client path identifiers ([e86ad1a](https://github.com/MiguelMedeiros/unforgit/commit/e86ad1aa2dbd2e20b8a6fb924eb9c95947a82b42))

## [0.7.8](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.7...v0.7.8) (2026-06-24)


### Bug Fixes

* **core:** keep bearer credentials private ([2881deb](https://github.com/MiguelMedeiros/unforgit/commit/2881deb2519a3613d624a1021b33c3a6ba37b4cb))

## [0.7.7](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.6...v0.7.7) (2026-06-22)


### Bug Fixes

* **api:** handle missing admin API key body ([f05cb20](https://github.com/MiguelMedeiros/unforgit/commit/f05cb20e0a4f1dd29e8eb472919763e787a60ba1))

## [0.7.6](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.5...v0.7.6) (2026-06-21)


### Bug Fixes

* **api:** reject malformed admin bearer headers ([#56](https://github.com/MiguelMedeiros/unforgit/issues/56)) ([42fed8e](https://github.com/MiguelMedeiros/unforgit/commit/42fed8effb552d40d184002f4cbf22bd0d8158d6))

## [0.7.5](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.4...v0.7.5) (2026-06-18)


### Bug Fixes

* **api:** tighten public auth route matching ([d8c36a3](https://github.com/MiguelMedeiros/unforgit/commit/d8c36a3b0525c56f712eeac8a4de9373f39ffea7))

## [0.7.4](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.3...v0.7.4) (2026-06-16)


### Bug Fixes

* **auth:** reject malformed bearer headers ([a21425d](https://github.com/MiguelMedeiros/unforgit/commit/a21425db9852890a078b167e0cfbab6a680e5cbd))

## [0.7.3](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.2...v0.7.3) (2026-06-16)


### Bug Fixes

* override vulnerable babel core dependency ([b06e05a](https://github.com/MiguelMedeiros/unforgit/commit/b06e05af07f0921a5c3181bcf0e4fc85277ce83f))

## [0.7.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.1...v0.7.2) (2026-06-15)


### Bug Fixes

* **auth:** harden OAuth state validation ([0a2a526](https://github.com/MiguelMedeiros/unforgit/commit/0a2a526db03e71f8875e8c76f5e5be18632de857))

## [0.7.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.7.0...v0.7.1) (2026-06-14)


### Bug Fixes

* **api:** validate GitHub OAuth state ([2a656d2](https://github.com/MiguelMedeiros/unforgit/commit/2a656d299386e0e7a9ccfb3527e5be08db6cb313))

## [0.7.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.6.0...v0.7.0) (2026-06-14)


### Features

* add local-first embeddings ([#42](https://github.com/MiguelMedeiros/unforgit/issues/42)) ([d28088f](https://github.com/MiguelMedeiros/unforgit/commit/d28088fd7de46ad69b86e26909bc30b7f510d705))


### Bug Fixes

* clarify local memory versus remote API diagnostics ([#45](https://github.com/MiguelMedeiros/unforgit/issues/45)) ([71cf8dc](https://github.com/MiguelMedeiros/unforgit/commit/71cf8dc335fd0b91722c8fc325c3e9a7502d752b))
* guard embedding provider compatibility ([#44](https://github.com/MiguelMedeiros/unforgit/issues/44)) ([f4203d5](https://github.com/MiguelMedeiros/unforgit/commit/f4203d5be3b437e4f98db04a2f430d1368943434))
* override vulnerable esbuild dependency ([f061b8d](https://github.com/MiguelMedeiros/unforgit/commit/f061b8dcffa06e1f35dec8b5904057459cbffa75))

## [0.6.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.6...v0.6.0) (2026-06-12)


### Features

* **cli:** back up before clearing embeddings ([#37](https://github.com/MiguelMedeiros/unforgit/issues/37)) ([6d3ed11](https://github.com/MiguelMedeiros/unforgit/commit/6d3ed11cbaef3e1caabc343a056c2116c607dc23))
* **cli:** back up before hard delete ([#40](https://github.com/MiguelMedeiros/unforgit/issues/40)) ([43a3a95](https://github.com/MiguelMedeiros/unforgit/commit/43a3a958fa6d1eb7e2463d639581752bfb948c0b))
* **cli:** clarify status sync JSON ([#39](https://github.com/MiguelMedeiros/unforgit/issues/39)) ([f21558b](https://github.com/MiguelMedeiros/unforgit/commit/f21558b72147cfcd71a8f808a60004b82953c9d6))
* **cli:** report embedding backfill results ([#38](https://github.com/MiguelMedeiros/unforgit/issues/38)) ([9e64c58](https://github.com/MiguelMedeiros/unforgit/commit/9e64c58d6af9d8af57f9d8c719708407238accf5))
* improve memory maturity diagnostics ([#34](https://github.com/MiguelMedeiros/unforgit/issues/34)) ([f36a803](https://github.com/MiguelMedeiros/unforgit/commit/f36a8032f27211382084fea7c9def85886f3fd1f))

## [0.5.6](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.5...v0.5.6) (2026-06-11)


### Bug Fixes

* **ci:** retry npm install verification after publish ([d9eb9f9](https://github.com/MiguelMedeiros/unforgit/commit/d9eb9f943ee7ae8908afc78f5fde9a3262f0c1ea))
* **test:** reduce package binary smoke test flakiness ([b5e09ea](https://github.com/MiguelMedeiros/unforgit/commit/b5e09ea3eb8cbd8e7aa426741d7ccee58d488466))

## [0.5.5](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.4...v0.5.5) (2026-06-11)


### Bug Fixes

* **security:** patch vulnerable dependencies ([#31](https://github.com/MiguelMedeiros/unforgit/issues/31)) ([c67f752](https://github.com/MiguelMedeiros/unforgit/commit/c67f75232d100233fe0941fe6d778dd214a560b0))

## [0.5.4](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.3...v0.5.4) (2026-06-11)


### Bug Fixes

* **cli:** bundle internal packages for npm install ([246b27d](https://github.com/MiguelMedeiros/unforgit/commit/246b27dace64baf75c8ca0a2676f3e89f7916abf))
* **cli:** keep workspace packages as build dependencies ([eb85159](https://github.com/MiguelMedeiros/unforgit/commit/eb851599c008e1e954d3aa07b05d01f6d5b6a9da))
* **test:** build package smoke dependencies serially ([b7f1863](https://github.com/MiguelMedeiros/unforgit/commit/b7f1863927c06a78977c72183075c47ed6167928))

## [0.5.3](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.2...v0.5.3) (2026-06-11)


### Bug Fixes

* **ci:** publish workspace packages before cli ([3e5b98a](https://github.com/MiguelMedeiros/unforgit/commit/3e5b98ab68bf4e1dae06a478864ecacee6eec9ab))

## [0.5.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.1...v0.5.2) (2026-06-11)


### Bug Fixes

* **cli:** publish mcp binary with npm package ([578e77f](https://github.com/MiguelMedeiros/unforgit/commit/578e77fe807143fdf48fe35e52ce883915bf9a61))

## [0.5.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.5.0...v0.5.1) (2026-06-11)


### Bug Fixes

* **website:** derive footer version from package metadata ([298ae75](https://github.com/MiguelMedeiros/unforgit/commit/298ae75777ba8183c10b1c5f884dbe3040857825))
* **website:** size command blocks to content ([3b6a739](https://github.com/MiguelMedeiros/unforgit/commit/3b6a739da17cf1710cd9ca6a83263779d2d8e01b))

## [0.5.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.4.0...v0.5.0) (2026-06-10)


### Features

* add reviewable curation suggestions ([0427bf0](https://github.com/MiguelMedeiros/unforgit/commit/0427bf0b8c1191df3aa92d738e6196c270bcc3ef))

## [0.4.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.3.2...v0.4.0) (2026-06-10)


### Features

* **cli:** add safe local dashboard command ([c160181](https://github.com/MiguelMedeiros/unforgit/commit/c1601812e7f1c1e536fef631a2f1e4cf4a6c6011))
* **web:** surface memory graph health ([cc8cf30](https://github.com/MiguelMedeiros/unforgit/commit/cc8cf3071de90d8576d112651f24a6c36f73e6b7))

## [0.3.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.3.1...v0.3.2) (2026-06-10)


### Bug Fixes

* **cli:** add repository metadata for provenance publish ([0af1144](https://github.com/MiguelMedeiros/unforgit/commit/0af114406510e429e9a292afe5fe31c61e8e3ef8))

## [0.3.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.3.0...v0.3.1) (2026-06-10)


### Bug Fixes

* clear quality findings after release ([9d02b76](https://github.com/MiguelMedeiros/unforgit/commit/9d02b7648edc97f48358d603b5a0544cf421f326))

## [0.3.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.2.1...v0.3.0) (2026-06-10)


### Features

* **cli:** manage local reset backups ([689317d](https://github.com/MiguelMedeiros/unforgit/commit/689317d678aea927766118bfd419b5d4d6f80c0a))

## [0.2.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.2.0...v0.2.1) (2026-06-10)


### Bug Fixes

* **cli:** back up local reset database ([98d5b73](https://github.com/MiguelMedeiros/unforgit/commit/98d5b73123d1f6b6814b40ff22f2df92ec616d9e))

## [0.2.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.1.0...v0.2.0) (2026-06-10)


### Features

* **cli:** harden doctor diagnostics ([e018ba9](https://github.com/MiguelMedeiros/unforgit/commit/e018ba98a0dc4ac77c27930ec148a8f4f1066762))


### Bug Fixes

* **cli:** harden IDE integration file writes ([21ec820](https://github.com/MiguelMedeiros/unforgit/commit/21ec8208c993fee67fcbe1e30a069c2bb422adbe))
* **config:** harden config file writes ([7110b6e](https://github.com/MiguelMedeiros/unforgit/commit/7110b6e843cd54fedf001b457dc90298b30016b6))

## 0.1.0 (2026-06-09)

Initial public release of Unforgit.

### Highlights

- Git-backed durable memory for AI agents and developer workflows.
- Local CLI for adding, recalling, syncing, curating, consolidating, and linking memories.
- MCP server integration for agent tool access.
- Local and remote storage packages with Prisma-backed remote service support.
- Website and documentation for installation, Hermes integration, and MCP setup.
- GitHub Actions CI quality gate for lint, tests, Prisma client generation, and builds.
