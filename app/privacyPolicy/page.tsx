export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[800px] mx-auto py-12 px-4">
      <h1 className="mb-2 text-2xl font-semibold text-[#1a1a1a]">Privacy Policy</h1>
      <p className="mb-8 text-xs text-[#a8a29e]">Last updated: October 23, 2026</p>

      <div className="space-y-6 text-sm leading-relaxed text-[#57534e] sm:text-base">
        <p>
          Balaka is a language-learning reading service, including a website and a browser
          extension. This Privacy Policy explains what personal data we collect, why we collect
          it, and what rights you have over it. We only collect what we need to run the service.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">1. Who is responsible for your data</h2>
          <p>
            The data controller for the personal data described in this policy is:
          </p>
          <ul className="mt-3 list-none space-y-1">
            <li>
              <strong className="text-[#1a1a1a]">Name:</strong> YOUR FULL NAME
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Tax ID (NIF):</strong> YOUR NIF
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Address:</strong> YOUR POSTAL ADDRESS, Spain
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Email:</strong>{' '}
              <a href="mailto:admin@balaka.app" className="text-[#1a1a1a] underline underline-offset-2">
                admin@balaka.app
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">2. What data we collect</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-[#1a1a1a]">Account data:</strong> your email address and
              password. Your password is handled by our authentication provider and is never
              visible to us in plain text.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Language preferences:</strong> the language you
              are learning and your native language.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Content you upload:</strong> texts you upload
              (.txt, .epub, .pdf) so we can process and show them back to you. You are
              responsible for having the right to use that content — see our{' '}
              <a href="/termsOfService" className="text-[#1a1a1a] underline underline-offset-2">
                Terms of Service
              </a>
              .
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Learning data:</strong> words and phrases you
              save as flashcards, your reading progress, and how many characters you have
              processed this month (to apply the Pro plan limit).
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Payment data:</strong> if you subscribe to Pro,
              payments are handled by Stripe. We never see or store your full card details; we
              only receive confirmation of payment and a reference to manage your subscription.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Technical data:</strong> standard information
              such as IP address and browser type, handled by our hosting providers for normal
              operation and security.
            </li>
          </ul>
          <p className="mt-3">
            We do not use cookies for advertising or tracking and we do not run analytics tools.
            If that changes, we will update this policy first and, where required, ask for your
            consent.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">3. Why we use your data</h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              To create and manage your account, translate and process the texts you read or
              upload, and process your Pro subscription payment. Legal basis:{' '}
              <strong className="text-[#1a1a1a]">performance of a contract</strong>.
            </li>
            <li>
              To enforce usage limits, answer support requests, and keep basic security and
              technical logs. Legal basis:{' '}
              <strong className="text-[#1a1a1a]">legitimate interests</strong>.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">4. Who receives your data</h2>
          <p className="mb-3">
            We use a small number of service providers, each receiving only what it needs:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Database, authentication, file storage and website hosting providers (our database is hosted in the EU).</li>
            <li>
              <strong className="text-[#1a1a1a]">Stripe</strong> — payment processing.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Anthropic</strong> (Claude AI) — the text you
              translate, or the text you upload for retelling or formatting, is sent to Anthropic
              to generate the result.
            </li>
          </ul>
          <p className="mt-3">
            We do not sell your personal data and we do not share it for advertising. If we add
            new providers, we will update this section before the related feature goes live.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">5. International transfers</h2>
          <p>
            Anthropic and Stripe are based in the United States, so some of your data is
            transferred outside the EU/EEA when you use features that rely on them. We rely on
            their data processing terms and Standard Contractual Clauses to protect your data.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">6. How long we keep your data</h2>
          <p>
            We keep your account data and content while your account is active. If you ask us to
            delete your account, we delete your personal data and content, except where we must
            keep certain records by law (for example, payment records for tax purposes) or where
            data remains briefly in routine backups.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">7. Your rights</h2>
          <p className="mb-3">
            If you are in the EU/EEA (or covered by similar law elsewhere), you have the right to
            access, correct, delete, restrict or object to the processing of your data, and to
            receive your data in a portable format.
          </p>
          <p className="mb-3">
            Account deletion is currently handled manually: email us at{' '}
            <a href="mailto:admin@balaka.app" className="text-[#1a1a1a] underline underline-offset-2">
              admin@balaka.app
            </a>{' '}
            and we will process your request promptly. For any other request, use the same
            address. You also have the right to complain to the Spanish data protection authority
            (Agencia Española de Protección de Datos, AEPD) or your local equivalent.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">8. Children</h2>
          <p>
            Balaka is not directed at children under 14. You must be at least 14 years old to
            create an account. If you believe a child under 14 has created an account, contact us
            and we will remove it.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">9. Balaka browser extension</h2>
          <p className="mb-3">If you use the Balaka Chrome extension:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-[#1a1a1a]">What is sent.</strong> Only when you click
              Translate or Explain, the text you selected and the sentence or paragraph around it
              are sent to our server and then to our AI provider (Anthropic) to produce the
              translation or explanation. The extension does not read or send any other page
              content and does not track your browsing history.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">What is stored on your device.</strong> Your
              saved words (with the address of the page you saved them from), your language
              settings (which Chrome may sync across your devices through your Google account),
              and a random device identifier used to count free monthly usage.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">What we keep.</strong> We do not store the
              selected text or its translation on our servers. We keep a request count linked to
              the random device identifier for as long as needed to apply monthly free-usage
              limits.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">No selling, no ads.</strong> We use this data
              only to provide translation and explanation features. We do not sell it or use it
              for advertising.
            </li>
            <li>
              <strong className="text-[#1a1a1a]">Removal.</strong> Uninstalling the extension
              deletes everything stored on your device.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">10. Changes and contact</h2>
          <p>
            We may update this policy as we add features or providers. If we make a material
            change, we will give notice, for example by email or a notice on the service, before
            it takes effect. Questions about this policy? Write to{' '}
            <a href="mailto:admin@balaka.app" className="text-[#1a1a1a] underline underline-offset-2">
              admin@balaka.app
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
