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
      <h1 class="font-display text-3xl text-slate-900">Terms of Service</h1>
      <p class="mt-2 text-sm text-slate-500">For authorised Propel CRM agents and administrators</p>
      <p class="mt-1 text-sm text-slate-500">Last updated: {{ LEGAL_LAST_UPDATED }}</p>
    </header>

    <div class="prose-legal space-y-8 text-sm leading-relaxed text-slate-700">
      <section>
        <h2 class="text-base font-semibold text-slate-900">1. Acceptance</h2>
        <p class="mt-2">
          By accessing Propel CRM you agree to these terms and our
          <RouterLink to="/privacy" class="font-medium text-brand-600 hover:text-brand-700">Privacy Policy</RouterLink>.
          If you do not agree, do not use the service.
        </p>
      </section>

      <section class="rounded-xl border border-brand-200 bg-brand-50/60 p-5">
        <h2 class="text-base font-semibold text-slate-900">2. Client data &amp; lawful basis (KDPA)</h2>
        <p class="mt-2">
          You may only upload, store, or process <strong>client or lead personal data</strong> in Propel CRM
          when you have a valid lawful basis under the Kenya Data Protection Act, 2019 — for example:
        </p>
        <ul class="mt-2 list-disc space-y-2 pl-5">
          <li>the individual has given <strong>clear consent</strong> for you to store their details for property-related follow-up;</li>
          <li>processing is necessary for steps at the individual&rsquo;s request before entering a contract; or</li>
          <li>another ground recognised under the KDPA applies to your agency&rsquo;s relationship with the client.</li>
        </ul>
        <p class="mt-2 font-medium text-slate-900">
          Do not import contact lists, spreadsheets, or third-party data unless you are satisfied that appropriate
          consent or another lawful basis exists. You are responsible for your compliance as a data controller
          (or joint controller) for client records you create.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">3. Acceptable use</h2>
        <ul class="mt-2 list-disc space-y-2 pl-5">
          <li>Use the platform only for legitimate real-estate business purposes authorised by your organisation.</li>
          <li>Keep login credentials confidential and report suspected unauthorised access promptly.</li>
          <li>Do not attempt to access contacts, reports, or admin functions outside your assigned role.</li>
          <li>Do not export or share client data except as permitted by law and your agency policies.</li>
        </ul>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">4. Confidentiality of exports</h2>
        <p class="mt-2">
          Reports and exports are delivered as password-protected ZIP archives using your Propel CRM
          account password. You must handle downloaded files securely, limit access to authorised
          colleagues, and delete copies when no longer required.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">5. Account suspension</h2>
        <p class="mt-2">
          Your organisation may deactivate accounts that violate these terms or pose a security risk. Super
          admin accounts are protected from deactivation by other administrators to prevent accidental lockout.
        </p>
      </section>

      <section>
        <h2 class="text-base font-semibold text-slate-900">6. Changes</h2>
        <p class="mt-2">
          We may update these terms. Material changes will be reflected on this page with an updated date.
          Continued use after changes constitutes acceptance.
        </p>
      </section>
    </div>
  </article>
</template>
