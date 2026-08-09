# Evidence Research provider compliance

Last reviewed: 2026-08-09
Runtime policy version: 2
Production discovery provider: Crossref REST API

## Decision

Evidence Research may persist source identity, show the source to the same user later, and fetch the public destination only when the discovery provider explicitly permits reuse of its structured metadata.

Google Search Grounding is **not permitted for this architecture**. Its current additional terms prohibit storing Links from Grounded Results and prohibit using Links programmatically to collect or identify destination pages for crawling or scraping. The production discovery path therefore does not call the Google Search tool and does not accept or persist Google Search result URLs.

Official record:

- [Gemini API Additional Terms — Grounding with Google Search](https://ai.google.dev/gemini-api/terms_preview)

## Approved provider: Crossref

Crossref's official REST API documentation states that its public API exposes scholarly metadata, almost none of that metadata is subject to copyright, and it may be used for any purpose. Public access requires no registration. Crossref also recommends caching responses to avoid repeated requests.

Official records:

- [Crossref REST API and metadata reuse](https://www.crossref.org/documentation/retrieve-metadata/rest-api/)
- [Crossref access, authentication and rate limits](https://www.crossref.org/documentation/retrieve-metadata/rest-api/access-and-authentication/)
- [Crossref full-text links and destination licensing](https://www.crossref.org/documentation/retrieve-metadata/rest-api/text-and-data-mining/)

## Data boundary

GrainDistrict persists only the minimum discovery record required for audit and replay:

- Crossref provider name and reviewed policy snapshot
- query ID and hash
- Crossref request provenance
- result rank
- DOI/metadata record ID
- title and public DOI URL

Crossref abstracts and search-response bodies are not stored. Usage logs contain no query text, claim text, DOI URL, source body, prompt or evidence excerpt.

The DOI destination is a separate public-source request, not a stored Crossref full-text result. Every destination and redirect passes the Source Assistant HTTPS, DNS, private-network, MIME and size controls. Only readable public content is evaluated. A destination that requires access, blocks retrieval or does not expose adequate text becomes `unreadable` or `no_reliable_source`; GrainDistrict does not bypass access controls.

## Runtime enforcement

- The query planner has no web-search tool and cannot provide candidate URLs.
- Candidate URLs are created only from structured Crossref work records.
- Canonical validation rejects automatic sources without `provider: crossref`, a metadata record ID, request provenance and the reviewed policy record.
- The provider policy is copied into every ResearchRun policy snapshot and every automatic Source record.
- Search-provider changes require a new policy version, updated official records and acceptance tests before production use.
