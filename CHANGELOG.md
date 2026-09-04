# Changelog

## Unreleased

### Changed

* **cli:** require Node.js 24.15+ and use its built-in SQLite driver, removing the native `better-sqlite3` install dependency and its deprecated `prebuild-install` warning while preserving existing local database files

## [0.11.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.11.1...v0.11.2) (2026-09-04)


### Bug Fixes

* **security:** preserve repository API key scope ([4f19331](https://github.com/MiguelMedeiros/unforgit/commit/4f19331c37e67024a7668536da554a087b393236))
* **security:** preserve repository API key scope ([706360a](https://github.com/MiguelMedeiros/unforgit/commit/706360acca09a7673f6e61bee6c79fb6ba69e69a))

## [0.11.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.11.0...v0.11.1) (2026-09-03)


### Bug Fixes

* close access revocation races ([c97815d](https://github.com/MiguelMedeiros/unforgit/commit/c97815d172f6fe3aef22ee09dfc12f5efdc64fbd))
* **deps:** patch browserslist and mysql2 advisories ([37d5c72](https://github.com/MiguelMedeiros/unforgit/commit/37d5c7285aedd8cde892b0b55bbaae4797297f2c))
* **deps:** patch fast-uri advisories ([3714a2e](https://github.com/MiguelMedeiros/unforgit/commit/3714a2e73a47f13d7ad4cfc170464f3e7490a3d7))
* **deps:** patch newly disclosed advisories ([#117](https://github.com/MiguelMedeiros/unforgit/issues/117)) ([a9b5757](https://github.com/MiguelMedeiros/unforgit/commit/a9b575739a07791fc4848fa7fd2b64695465fc61))
* harden access refresh and SQLite writes ([921d1f3](https://github.com/MiguelMedeiros/unforgit/commit/921d1f3c1355d2814571543978d4ddbca9d1e766))
* harden user credentials and SQLite writes ([a95acd3](https://github.com/MiguelMedeiros/unforgit/commit/a95acd3217420c7a60a82ad88b75e9737c3022f9))
* **security:** avoid unsafe OAuth access revocation ([5b4ce0b](https://github.com/MiguelMedeiros/unforgit/commit/5b4ce0ba9818008af9e81c65811fa8da9aa0ce08))
* **security:** enforce admin consolidation scope ([#114](https://github.com/MiguelMedeiros/unforgit/issues/114)) ([c491987](https://github.com/MiguelMedeiros/unforgit/commit/c4919879d812fe5bafdc938a23eca6d065abfbea))

## [0.11.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.10.1...v0.11.0) (2026-08-31)


### Features

* **cli:** use built-in SQLite ([#109](https://github.com/MiguelMedeiros/unforgit/issues/109)) ([897991d](https://github.com/MiguelMedeiros/unforgit/commit/897991d630c17462dbb3a5a45b066e93201dd3a1))


### Bug Fixes

* **curation:** harden review workflow ([#111](https://github.com/MiguelMedeiros/unforgit/issues/111)) ([8b9e65d](https://github.com/MiguelMedeiros/unforgit/commit/8b9e65d3c74ce75b11dc197dba3db998b7d6c07d))

## [0.10.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.10.0...v0.10.1) (2026-08-31)


### Bug Fixes

* **api:** validate delete request body ([#107](https://github.com/MiguelMedeiros/unforgit/issues/107)) ([2a2f5fe](https://github.com/MiguelMedeiros/unforgit/commit/2a2f5fe907ac7ffb5c9e2a0ecc8bba23a9e81995))
* **lint:** ignore generated agent worktrees ([#110](https://github.com/MiguelMedeiros/unforgit/issues/110)) ([d9cf19e](https://github.com/MiguelMedeiros/unforgit/commit/d9cf19e764e615bf7f3cabbed0406d435372f4f2))
* **lint:** remove recurring React warnings ([#112](https://github.com/MiguelMedeiros/unforgit/issues/112)) ([cca0bb6](https://github.com/MiguelMedeiros/unforgit/commit/cca0bb66a8bf48597d19666e5f8f8021acd9c65d))

## [0.10.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.9.3...v0.10.0) (2026-08-29)


### Features

* add Claude Code plugin marketplace ([5c0cb7e](https://github.com/MiguelMedeiros/unforgit/commit/5c0cb7eec2f1ed1d310086971cb87676522fc205))
* add Cline Roo Codex OpenCode integrations ([c75bf2e](https://github.com/MiguelMedeiros/unforgit/commit/c75bf2edef6f6cee3da3e0f96fd37df45bda7a4e))
* add Hermes Unforgit memory skill ([f5d7366](https://github.com/MiguelMedeiros/unforgit/commit/f5d736625ba28d438ff2ddd87f233960de900ab7))
* **cli:** add Kilo Code integration ([#73](https://github.com/MiguelMedeiros/unforgit/issues/73)) ([2ee0123](https://github.com/MiguelMedeiros/unforgit/commit/2ee01233f6094165631b9f66e54eaa13fcf9fba2))


### Bug Fixes

* **api:** authorize API key management ([#96](https://github.com/MiguelMedeiros/unforgit/issues/96)) ([bdad42a](https://github.com/MiguelMedeiros/unforgit/commit/bdad42a97b15e551f6a6e71679013c8b698c166b))
* **api:** authorize auto-consolidation ([#89](https://github.com/MiguelMedeiros/unforgit/issues/89)) ([eb10a36](https://github.com/MiguelMedeiros/unforgit/commit/eb10a36cb61d020a68eb29d56e1b75a8d6ffeafb))
* **api:** authorize destructive repository reset ([#82](https://github.com/MiguelMedeiros/unforgit/issues/82)) ([6a0e033](https://github.com/MiguelMedeiros/unforgit/commit/6a0e033a67764aab6230de07fb8537aa58f544d7))
* **api:** authorize lifecycle maintenance ([#86](https://github.com/MiguelMedeiros/unforgit/issues/86)) ([58e7f39](https://github.com/MiguelMedeiros/unforgit/commit/58e7f39d688aecc97272681ac622bc00b148bbcc))
* **api:** authorize link operations ([#95](https://github.com/MiguelMedeiros/unforgit/issues/95)) ([e0a8faf](https://github.com/MiguelMedeiros/unforgit/commit/e0a8fafda92060cef4b87b623f6cffa69cb1b97e))
* **api:** authorize memory consolidation ([#88](https://github.com/MiguelMedeiros/unforgit/issues/88)) ([a2b1084](https://github.com/MiguelMedeiros/unforgit/commit/a2b1084a094723e41c479b5bd4d91e2a600686cf))
* **api:** authorize memory creation ([#94](https://github.com/MiguelMedeiros/unforgit/issues/94)) ([2bac2de](https://github.com/MiguelMedeiros/unforgit/commit/2bac2def8fe8c73f1c5546043ccbb0a6c3594864))
* **api:** authorize memory curation ([#98](https://github.com/MiguelMedeiros/unforgit/issues/98)) ([2df09db](https://github.com/MiguelMedeiros/unforgit/commit/2df09db9053bdd43726252515ad404c7ed789c90))
* **api:** authorize memory deletion ([#83](https://github.com/MiguelMedeiros/unforgit/issues/83)) ([2cc512a](https://github.com/MiguelMedeiros/unforgit/commit/2cc512ae75c36a033676e098038f26a675a61acc))
* **api:** authorize memory reads ([#90](https://github.com/MiguelMedeiros/unforgit/issues/90)) ([bc20d76](https://github.com/MiguelMedeiros/unforgit/commit/bc20d761de668617b73694854eeebe042b15904f))
* **api:** authorize memory recall ([#92](https://github.com/MiguelMedeiros/unforgit/issues/92)) ([4863766](https://github.com/MiguelMedeiros/unforgit/commit/48637662670f10d15d4e5d9f240daee91c4e944e))
* **api:** authorize organization API key creation ([#84](https://github.com/MiguelMedeiros/unforgit/issues/84)) ([d93edc8](https://github.com/MiguelMedeiros/unforgit/commit/d93edc840d2c68d5559e23ca47daae2ca48da96c))
* **api:** authorize repository insight routes ([#99](https://github.com/MiguelMedeiros/unforgit/issues/99)) ([bf8c6bd](https://github.com/MiguelMedeiros/unforgit/commit/bf8c6bdecf044ada816e04cbae1a2627e66e78b2))
* **api:** authorize sync operations ([#91](https://github.com/MiguelMedeiros/unforgit/issues/91)) ([40e3997](https://github.com/MiguelMedeiros/unforgit/commit/40e3997e69ebeacb74adcdf3c38b1228faa69687))
* **api:** authorize sync push targets ([#101](https://github.com/MiguelMedeiros/unforgit/issues/101)) ([171dda4](https://github.com/MiguelMedeiros/unforgit/commit/171dda4a78ca77359d8dc6b6c0438817f2bab837))
* **api:** authorize sync tombstone targets ([#100](https://github.com/MiguelMedeiros/unforgit/issues/100)) ([8ada495](https://github.com/MiguelMedeiros/unforgit/commit/8ada4952cc0c1ffe81bfa58e1b5353400ebde28a))
* **api:** reject missing API key request body ([76accde](https://github.com/MiguelMedeiros/unforgit/commit/76accdecf021531f2b12410435a4ee45605766e4))
* **api:** reject missing link request bodies ([45d569d](https://github.com/MiguelMedeiros/unforgit/commit/45d569d563046e44fe42f6efa413e4a8b22a1099))
* **api:** reject missing sync push body ([4ab0c00](https://github.com/MiguelMedeiros/unforgit/commit/4ab0c00639dc88c35c14a38d350ab5369c700167))
* **api:** reject missing tombstone body ([421f5f0](https://github.com/MiguelMedeiros/unforgit/commit/421f5f04954008b5035c6e088451412be7cfcbdd))
* **api:** revoke stale admin sessions ([#104](https://github.com/MiguelMedeiros/unforgit/issues/104)) ([df38b9e](https://github.com/MiguelMedeiros/unforgit/commit/df38b9eaf29d0c88707af7f1f094e829ef6224d0))
* **api:** validate admin stats query parameters ([846a2d7](https://github.com/MiguelMedeiros/unforgit/commit/846a2d7802fde66bd1183a339ca48ba9920c1ce1))
* **api:** validate log query inputs ([#103](https://github.com/MiguelMedeiros/unforgit/issues/103)) ([8ae268e](https://github.com/MiguelMedeiros/unforgit/commit/8ae268ea17621dcee62307146e7e02a6bdd1812f))
* **api:** validate memory pagination parameters ([5c22d93](https://github.com/MiguelMedeiros/unforgit/commit/5c22d930de8e2691e18463d98f6b61f5bc743f17))
* **api:** validate sync inputs ([#102](https://github.com/MiguelMedeiros/unforgit/issues/102)) ([4e21be3](https://github.com/MiguelMedeiros/unforgit/commit/4e21be3cb3fea87e5a401cc256890505e11a856c))
* **auth:** authorize user API key scopes ([608a584](https://github.com/MiguelMedeiros/unforgit/commit/608a584ae5b91f7299d724433b203bca1773d1c7))
* **deps:** patch brace expansion memory DoS ([#81](https://github.com/MiguelMedeiros/unforgit/issues/81)) ([155bd5f](https://github.com/MiguelMedeiros/unforgit/commit/155bd5f2be6f6d60def199dd659968e72706d5bf))
* **deps:** patch deepmerge cycle denial of service ([#97](https://github.com/MiguelMedeiros/unforgit/issues/97)) ([bdf2805](https://github.com/MiguelMedeiros/unforgit/commit/bdf2805f6577c53465a26b32de842d5d31b5a116))
* **deps:** patch find-my-way HTTP/2 DoS ([#78](https://github.com/MiguelMedeiros/unforgit/issues/78)) ([462766b](https://github.com/MiguelMedeiros/unforgit/commit/462766be9c689118fea9bef883281a4041ea1b82))
* **deps:** patch js-yaml ordered-map DoS ([#87](https://github.com/MiguelMedeiros/unforgit/issues/87)) ([2323122](https://github.com/MiguelMedeiros/unforgit/commit/23231229071e4178aeb4811546cdd1ff5614d035))
* **deps:** patch nanoid zero-size denial of service ([#93](https://github.com/MiguelMedeiros/unforgit/issues/93)) ([b558931](https://github.com/MiguelMedeiros/unforgit/commit/b5589315b31dd0ca441aa00e3cdcea0f020e9fa2))
* **deps:** patch newly disclosed security advisories ([#76](https://github.com/MiguelMedeiros/unforgit/issues/76)) ([f33fbb1](https://github.com/MiguelMedeiros/unforgit/commit/f33fbb1f037354eed4da231cc50ed5b42dd797c3))
* **deps:** patch Next.js security advisories ([#77](https://github.com/MiguelMedeiros/unforgit/issues/77)) ([713a205](https://github.com/MiguelMedeiros/unforgit/commit/713a2050a02f45ed4c79682994d7b6370c8985d5))
* **deps:** patch PostCSS source map disclosure ([#79](https://github.com/MiguelMedeiros/unforgit/issues/79)) ([c0a987d](https://github.com/MiguelMedeiros/unforgit/commit/c0a987ddf4b5e7c1c9e0ac158f32aa7c378eebe6))
* **deps:** patch security advisories and api runtime ([#75](https://github.com/MiguelMedeiros/unforgit/issues/75)) ([dbeba92](https://github.com/MiguelMedeiros/unforgit/commit/dbeba92b4a850f1fe008b5440651bb07578408cb))
* **docker:** pin compatible pnpm version ([#74](https://github.com/MiguelMedeiros/unforgit/issues/74)) ([8168712](https://github.com/MiguelMedeiros/unforgit/commit/816871267b92e09b8e60fef48058453eb5294fdb))
* preserve consolidation sources and patch advisories ([#80](https://github.com/MiguelMedeiros/unforgit/issues/80)) ([544bbf8](https://github.com/MiguelMedeiros/unforgit/commit/544bbf8a90432fa74aa44a2a03f87be5fd00dfc2))
* preserve sync conflicts and patch advisories ([#85](https://github.com/MiguelMedeiros/unforgit/issues/85)) ([e1cbef1](https://github.com/MiguelMedeiros/unforgit/commit/e1cbef117b39ebb49161588ea6d4cc2934893e1d))
* restart postgres unless stopped ([695edcc](https://github.com/MiguelMedeiros/unforgit/commit/695edcc5c79f4a3a22d2e270663454fa4297303e))
* revoke credentials after access removal ([#105](https://github.com/MiguelMedeiros/unforgit/issues/105)) ([d0c05f6](https://github.com/MiguelMedeiros/unforgit/commit/d0c05f65434aefe4970ce42e6ef721e7d6f13fb1))

## [0.9.3](https://github.com/MiguelMedeiros/unforgit/compare/v0.9.2...v0.9.3) (2026-07-08)


### Bug Fixes

* **api:** handle missing user api key body ([290ca12](https://github.com/MiguelMedeiros/unforgit/commit/290ca12eda70e8a0021c5b527ccadeb994010ee2))

## [0.9.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.9.1...v0.9.2) (2026-07-06)


### Bug Fixes

* **api:** validate stats numeric query params ([955b386](https://github.com/MiguelMedeiros/unforgit/commit/955b3866e0e6026dd9efe4608d9fceb93ed448de))

## [0.9.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.9.0...v0.9.1) (2026-07-05)


### Bug Fixes

* **website:** improve mobile bridge and dashboard sections ([726bdc0](https://github.com/MiguelMedeiros/unforgit/commit/726bdc0d07cf47d26fe27452d2c7c4c44f6df4b9))
* **website:** simplify mobile navigation ([feaca8e](https://github.com/MiguelMedeiros/unforgit/commit/feaca8e3d0993997fde2450dd2ed0f471757a61d))
* **website:** tighten mobile intro spacing ([67943a7](https://github.com/MiguelMedeiros/unforgit/commit/67943a77d96fef698b8734e1b6b0db08854ad194))

## [0.9.0](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.5...v0.9.0) (2026-07-05)


### Features

* add markdown memory bridge ([#68](https://github.com/MiguelMedeiros/unforgit/issues/68)) ([962ca4d](https://github.com/MiguelMedeiros/unforgit/commit/962ca4d003e236ef965643b9f0040d887ef0f6a6))


### Bug Fixes

* **api:** tolerate empty admin consolidation bodies ([c2d3ff8](https://github.com/MiguelMedeiros/unforgit/commit/c2d3ff827229e185853b4fdbfc18e16e5c98c67b))

## [0.8.5](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.4...v0.8.5) (2026-07-02)


### Bug Fixes

* handle empty admin user request bodies ([833ca77](https://github.com/MiguelMedeiros/unforgit/commit/833ca77c06d02769afcf15e4c0cd2826d73f7510))

## [0.8.4](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.3...v0.8.4) (2026-06-30)


### Bug Fixes

* **config:** reject malformed numeric options ([d962811](https://github.com/MiguelMedeiros/unforgit/commit/d9628111e7e5f6ae23007660fce3a55dafba2331))

## [0.8.3](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.2...v0.8.3) (2026-06-28)


### Bug Fixes

* **db:** apply filters in remote FTS recall ([3aecb69](https://github.com/MiguelMedeiros/unforgit/commit/3aecb690b6aa58682f4f6c649a2e6f0b317ddc89))
* **web:** clarify activity heatmap scope ([b891a11](https://github.com/MiguelMedeiros/unforgit/commit/b891a11649ff549b3a35a433ddc2eb69e1327c30))

## [0.8.2](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.1...v0.8.2) (2026-06-28)


### Bug Fixes

* **release:** republish after author attribution correction ([06a333c](https://github.com/MiguelMedeiros/unforgit/commit/06a333c6a9498298b243869478663fafbe56c27a))

## [0.8.1](https://github.com/MiguelMedeiros/unforgit/compare/v0.8.0...v0.8.1) (2026-06-28)


### Bug Fixes

* **website:** refresh audited dependency lockfile ([c49c55f](https://github.com/MiguelMedeiros/unforgit/commit/c49c55f5aa5cb66aa66628e360e44f22f18c21cc))

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
