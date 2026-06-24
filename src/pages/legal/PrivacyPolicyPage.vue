<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppLogo from '@/components/shared/AppLogo.vue'
import { LEGAL_LAST_UPDATED } from '@/utils/legal'
</script>

<template>
  <article class="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm sm:p-10">
    <div class="mb-8 flex flex-col gap-6 border-b border-slate-100 pb-8 sm:flex-row sm:items-center sm:justify-between">
      <AppLogo variant="auth" />
      <RouterLink to="/login" class="text-sm font-semibold text-brand-600 hover:text-brand-700">
        Back to sign in
      </RouterLink>
    </div>

    <header class="mb-8">
      <h1 class="font-display text-3xl text-slate-900">Privacy Policy</h1>
      <p class="mt-2 text-sm text-slate-500">Last updated: {{ LEGAL_LAST_UPDATED }}</p>
      <p class="mt-4 text-sm leading-relaxed text-slate-600">
        This policy describes how Propel CRM (&ldquo;we&rdquo;, &ldquo;us&rdquo;) processes personal data when you
        use our real-estate contact management platform. It is intended to meet a baseline under the Kenya Data
        Protection Act, 2019 (KDPA) and guidance from the Office of the Data Protection Commissioner (ODPC).
      </p>
    </header>

    <div class="prose-legal space-y-8 text-sm leading-relaxed text-slate-700">
      <section>
        <h2 class="text-base font-semibold text-slate-900">1. Who we are</h2>
        <p class="mt-2">
          The organisation operating this deployment acts as the <strong>data controller</strong> for account,
          security, and platform data. Real-estate agents using Propel CRM remain responsible for the client
          contact data they enter (see our
          <RouterLink to="/terms" class="font-medium text-brand-600 hover:text-brand-700">Terms of Service</RouterLink>).
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">2. What we collect</h2>
        <ul class="mt-2 list-disc space-y-2 pl-5">
          <li>
            <strong>Agent account data:</strong> name, work email, phone, agency, password (stored hashed),
            role, notification preferences, login and security events.
          </li>
          <li>
            <strong>Client / lead data</strong> (entered by agents): name, phone, email, property interests,
            budget, location preferences, lead source, notes, follow-up dates, conversion status.
          </li>
          <li>
            <strong>Activity data:</strong> interactions (calls, meetings, etc.), follow-ups, sharing permissions,
            and exports generated from the system.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, browser user-agent, and audit logs for security,
            troubleshooting, and compliance.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">3. Why we use it</h2>
        <ul class="mt-2 list-disc space-y-2 pl-5">
          <li>Provide and improve the CRM service (contract / legitimate interest).</li>
          <li>Authenticate users, prevent fraud, and enforce access controls (legitimate interest / legal obligation).</li>
          <li>Generate reports and exports requested by authorised users (contract).</li>
          <li>Maintain audit trails for security and accountability (legitimate interest / legal obligation).</li>
        </ul>
        <p class="mt-2">
          Agents must have a lawful basis — typically <strong>consent</strong> or another valid ground under the
          KDPA — before uploading client contact details. We do not verify consent on their behalf.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">4. Sharing and storage</h2>
        <p class="mt-2">
          Data is stored in MongoDB (often MongoDB Atlas). Hosting may be outside Kenya depending on your
          deployment region. We use encryption in transit (HTTPS), access controls, and role-based permissions.
          We do not sell personal data. Service providers (e.g. hosting, email delivery) process data only to
          operate the service.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">5. Retention</h2>
        <p class="mt-2">
          Active account and CRM records are kept while the service is in use. Deleted contacts and deactivated
          accounts are <strong>soft-deleted</strong> (hidden from the application but retained for recovery,
          audit, and legal purposes) until a valid erasure request is processed by your organisation.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">6. Your rights</h2>
        <p class="mt-2">
          Under the KDPA, data subjects may request access, correction, deletion, restriction, or objection,
          subject to legal exceptions. Agents should direct client requests to their agency; account holders may
          contact the platform operator using the details provided by your organisation administrator.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">7. Contact &amp; complaints</h2>
        <p class="mt-2">
          For privacy questions, contact your Propel CRM administrator or the organisation named in your
          deployment documentation. You may also lodge a complaint with the
          <a
            href="https://www.odpc.go.ke"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-brand-600 hover:text-brand-700"
          >Office of the Data Protection Commissioner (ODPC)</a>.
        </p>
      </section>
    </div>
  </article>
</template>
