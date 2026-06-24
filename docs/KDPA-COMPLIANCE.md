# KDPA compliance baseline — Propel CRM

Internal reference for operators deploying Propel CRM in Kenya. **This is not legal advice.** Confirm obligations with qualified counsel before production launch.

Last reviewed: 24 June 2026

## Published artefacts

| Item | Location |
|------|----------|
| Privacy Policy | `/privacy` in the web app |
| Agent Terms of Service (incl. consent / lawful-basis clause) | `/terms` in the web app |
| Export confidentiality reminder | Reports page + Settings → Export Preferences |

## ODPC registration — self-assessment

Under the **Kenya Data Protection Act, 2019**, entities that determine the purpose and means of processing personal data generally act as **data controllers** and may need to **register with the ODPC**.

### Likely roles in this deployment

| Party | Typical role | Data involved |
|-------|----------------|---------------|
| Organisation operating Propel CRM (your company) | **Data controller** for agent accounts, platform security logs, hosting configuration | Agent names, emails, audit/IP logs |
| Individual real-estate agents | **Data controller** (or joint controller) for **client/lead records** they create | Client names, phones, emails, notes, interactions |
| Propel CRM as software | Tool / processor on behalf of the operator — **not** a separate SaaS vendor unless you resell hosted CRM to third parties |

### Registration triggers to discuss with counsel

1. **Are you processing personal data as a data controller in Kenya?**  
   If you operate this CRM for your own agency or internal team → **likely yes** for employee/agent account data.

2. **Do you process data on behalf of other agencies (multi-tenant B2B)?**  
   You may also need to consider **data processor** registration and contracts with each client agency.

3. **Volume / sensitivity** — client financial preferences and contact details are personal data; volume grows with every lead imported.

4. **Cross-border transfer** — MongoDB Atlas regions outside Kenya may require additional safeguards under KDPA; document the hosting region in your privacy policy and DPIA.

### Practical recommendation

| Action | Priority |
|--------|----------|
| Short consult with a Kenya data-protection lawyer or ODPC-registered DPO | **Before production** |
| Register as data controller (and processor if applicable) at [odpc.go.ke](https://www.odpc.go.ke) if counsel advises | As directed |
| Maintain a Record of Processing Activities (ROPA) | High |
| Appoint / name a contact for data-subject requests | High |

**Working assumption for this codebase:** the deploying organisation is the primary controller for platform operations; agents are controllers for client data they upload. ODPC registration is **probably required** for a live Kenyan deployment processing client PII — **confirm with counsel**, not code.

## Soft delete — current state (sufficient for now)

The application uses **soft delete** for the main personal-data entities:

| Entity | Mechanism | Effect |
|--------|-----------|--------|
| **Contacts** | `deletedAt`, `deletedBy` on `Contact` | Excluded from queries via `notDeletedFilter`; not shown in UI |
| **Users** | `deletedAt`, `deletedBy` on `User` | Rejected at authentication middleware when soft-deleted |

Interactions and follow-ups are tied to contacts; they are not independently soft-deleted today but become inaccessible when the parent contact is soft-deleted and filtered from normal access paths.

**Why soft delete is acceptable for now:** supports recovery from accidental deletion, preserves audit integrity, and aligns with legitimate-interest retention for business records.

## Plan: hard deletion / erasure requests

If a data subject (client or former agent) submits a valid **erasure request** under KDPA Article 40 (right to deletion), use this runbook:

### 1. Intake & verification (within 5 business days)

- Log the request (ticket + `AuditLog` note if manual).
- Verify identity and authority (client → via agency; agent → via HR/admin).
- Determine scope: single contact, all contacts for an agent, or full account erasure.

### 2. Legal review

- Check exceptions (ongoing contract, legal claim, audit obligation).
- If erasure is refused, document reason and respond to the subject within **one month** (KDPA default).

### 3. Technical erasure steps

**Contact / client erasure**

1. Locate contact by ID or email (`emailNormalized` / `phoneNormalized`).
2. Hard-delete or irreversibly anonymise:
   - `Contact` document
   - Related `Interaction` and `FollowUp` records
   - `SharedAccess` rows for that contact
3. Redact or aggregate audit log entries that contain the subject’s name/email in `metadata` (audit logs may be retained in anonymised form for security).

**Agent account erasure**

1. Deactivate account (`isActive: false`).
2. Transfer or delete owned contacts per agency policy.
3. Remove PII from `User` (name → `Deleted User`, email → `deleted+<id>@anonymised.local`, clear phone/agency) **or** hard-delete if no retention duty.
4. Set `deletedAt` if not already set; purge refresh tokens / sessions.

**Backups:** MongoDB Atlas point-in-time backups may retain data until backup expiry. Document backup retention in ROPA; schedule deletion/anonymisation in active DB and rely on backup TTL for residual copies.

### 4. Confirm & close

- Email the requester when complete.
- Record completion date and operator in the ticket.

### Future code improvements (optional backlog)

- `purgeContact(contactId)` admin mutation with audit trail
- `anonymiseUser(userId)` for HR off-boarding
- Automated export of subject access requests (DSAR)

## Operator checklist before go-live

- [ ] Privacy Policy and Terms linked from login screen
- [ ] ODPC registration status confirmed with lawyer
- [ ] Hosting region and DPA with MongoDB Atlas documented
- [ ] Named privacy contact email published to agents
- [ ] Erasure runbook shared with support / admin team
- [ ] Agent onboarding mentions lawful basis for client data (Terms §2)
