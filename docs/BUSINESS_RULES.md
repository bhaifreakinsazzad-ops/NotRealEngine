# Business rules

- Exactly 10 canonical categories contain 12 offers. Administrators may edit descriptive content but must not change canonical architecture through content editing.
- Web Application and PWA are separate offers. Automation/integrations are capabilities.
- All customer-visible prices use integer minor units and require active service/package, approved package and version, market/currency applicability, effective dates, one unambiguous match, and approval identity/time.
- Accepted quote snapshots preserve scope, items, exclusions, currency, totals, revisions, payment schedule, terms version, customer identity, and timestamp. Historical orders never recalculate.
- Anonymous email does not prove ownership. A brief is linked to a customer organization only after verified identity and an authorized staff workflow.
- Browser actions cannot mark payments verified. A future provider adapter must authenticate webhooks, persist a unique provider event, verify amount/currency/order, and process idempotently.
- Project production begins only after confirmed-order and requirement gates defined by the approved operating workflow.
- Revision count cannot exceed the accepted snapshot limit.
- External notification failure may retry or remain disabled; it never rolls back a valid order/project transaction.
