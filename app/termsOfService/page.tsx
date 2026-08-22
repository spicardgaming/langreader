export default function TermsOfServicePage() {
  return (
    <div className="max-w-[800px] mx-auto py-12 px-4">
      <h1 className="mb-2 text-2xl font-semibold text-[#1a1a1a]">Terms of Service</h1>
      <p className="mb-8 text-xs text-[#a8a29e]">Last updated: [fill in date of publishing]</p>

      <div className="space-y-6 text-sm leading-relaxed text-[#57534e] sm:text-base">
        <p>
          Welcome to Balaka, a service provided by Oleksandr Zlydennyi (&quot;Balaka&quot;,
          &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), an individual based in Spain.
        </p>
        <p>
          Please read these Terms of Service (&quot;Terms&quot;) carefully before using the
          Balaka website and apps (the &quot;Service&quot;). By using the Service, you agree to
          these Terms. If you do not agree to these Terms, please do not use the Service.
        </p>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">1. Eligibility</h2>
          <p>
            You must be at least 14 years old to create an account and use the Service. If you
            are under the age of majority where you live, you may only use the Service with the
            involvement and consent of a parent or guardian. By using the Service, you confirm
            that you meet these requirements.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">2. Your Account</h2>
          <p>
            To use most features, you need to create an account. You&apos;re responsible for
            keeping your login details secure and for all activity under your account. Please
            use an email address you can access, since we use it for important account and
            billing information. Let us know promptly if you believe your account has been
            accessed without your permission.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">3. Your Content</h2>
          <p className="mb-3">
            The Service lets you upload texts (.txt, .epub, .pdf) to read, have formatted for
            readability, or have simplified into an easier retelling (&quot;Content&quot;). You
            keep ownership of your Content — we don&apos;t claim any ownership over it.
          </p>
          <p className="mb-3">
            By uploading Content, you grant us a limited, non-exclusive licence to store,
            process, translate, and generate a simplified version of that Content, including
            sending it to third-party AI providers (see our{' '}
            <a href="/privacyPolicy" className="text-[#1a1a1a] underline underline-offset-2">
              Privacy Policy
            </a>
            ) for the purpose of operating the Service for you. This licence ends when you delete
            the Content or your account, except for copies kept briefly in routine backups.
          </p>
          <p>
            You&apos;re responsible for your Content, including having the right to use and
            upload it, and for making sure it doesn&apos;t infringe anyone else&apos;s copyright
            or other rights. We may remove Content or suspend accounts we reasonably believe
            breach this section or the law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">4. Acceptable Use</h2>
          <p>
            You agree not to misuse the Service — for example, by trying to disrupt it, gain
            unauthorized access, use it to break the law or infringe others&apos; rights, or use
            automated means to extract data or bypass usage limits. We may apply reasonable usage
            limits (for example, monthly character limits on Pro) to keep the Service running
            well and financially sustainable.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">5. Privacy</h2>
          <p>
            Our{' '}
            <a href="/privacyPolicy" className="text-[#1a1a1a] underline underline-offset-2">
              Privacy Policy
            </a>{' '}
            explains how we collect, use, and share your personal data. By using the Service,
            you agree to our handling of your data as described there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">6. Subscriptions and Billing</h2>
          <p className="mb-3">
            Balaka offers a free plan with limited features, and a paid Pro subscription ($4.99/month
            at the time of writing) that unlocks uploading your own texts, simplified retellings,
            and other features described on our{' '}
            <a href="/pricing" className="text-[#1a1a1a] underline underline-offset-2">
              Pricing
            </a>{' '}
            page.
          </p>
          <p className="mb-3">
            Subscriptions renew automatically each month using your saved payment method, until
            you cancel. Payments are processed by Stripe; we don&apos;t store your full card
            details.
          </p>
          <p>
            We may change subscription prices from time to time. Any price change will only apply
            to billing periods that begin after the change, never to a period you&apos;ve already
            paid for.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">7. Cancellation and Refunds</h2>
          <p className="mb-3">
            You can cancel your subscription at any time from your account settings. When you
            cancel, your subscription stops renewing, and you keep your paid Pro access until the
            end of the billing period you&apos;ve already paid for. We don&apos;t generally
            provide refunds for partial periods.
          </p>
          <p>
            If you&apos;re a consumer in the EU/EEA, you have a statutory right to withdraw from
            a purchase within 14 days. Because the Service is digital content supplied to you
            immediately, by starting to use your paid subscription during that period, you ask us
            to begin providing it straight away and acknowledge you may lose the right of
            withdrawal once the service has been fully provided. Nothing in these Terms limits
            any right you have under mandatory consumer law. If you believe you&apos;ve been
            charged in error, please contact us and we&apos;ll try to put it right.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">8. Our Intellectual Property</h2>
          <p>
            The Service itself — its software, design, and branding — belongs to us. These Terms
            don&apos;t give you any right to use our name or branding, or to copy or
            reverse-engineer the Service, except as allowed by law.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">9. Third-Party Services</h2>
          <p>
            The Service relies on third-party providers — for translation and AI features
            (Anthropic), payments (Stripe), and hosting/infrastructure (Supabase, Vercel,
            Railway). We&apos;re not responsible for the availability or performance of these
            third-party services, though we choose and monitor them carefully.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">10. Disclaimers</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot;, without
            warranties of any kind, to the fullest extent permitted by law. Balaka is a
            language-learning aid — translations, simplified retellings, and other AI-generated
            content can occasionally be incomplete or wrong, and shouldn&apos;t be relied on as
            professional, legal, or other authoritative advice. We don&apos;t guarantee the
            Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">11. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, we won&apos;t be liable for any indirect,
            incidental, or consequential losses, or for loss of data or profits, arising from
            your use of (or inability to use) the Service. Our total liability to you for any
            claim relating to the Service won&apos;t exceed the amount you paid us in the 12
            months before the claim. Nothing in these Terms excludes or limits liability that
            can&apos;t be excluded or limited under applicable law, including your rights as a
            consumer.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">12. Termination</h2>
          <p>
            You can stop using the Service and request deletion of your account at any time (see
            our{' '}
            <a href="/privacyPolicy" className="text-[#1a1a1a] underline underline-offset-2">
              Privacy Policy
            </a>{' '}
            for how). We may suspend or terminate your access if you materially or repeatedly
            breach these Terms, if required by law, or if reasonably necessary to protect the
            Service or other users. Where reasonable, we&apos;ll give you notice first.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of Spain. Any disputes will be subject to the
            courts of Spain, except that if you&apos;re a consumer, you may also be entitled to
            bring proceedings in the courts of your country of residence and to rely on
            mandatory consumer-protection rules there.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">14. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. If a change is material, we&apos;ll give
            at least 30 days&apos; notice before it takes effect, for example by email or a
            notice on the Service. By continuing to use the Service after changes take effect,
            you agree to the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-medium text-[#1a1a1a]">15. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us at{' '}
            <span className="text-[#a8a29e]">[contact email]</span>.
          </p>
        </section>

        <p className="border-t border-[#e7e5e4] pt-6 text-xs italic text-[#a8a29e]">
          These Terms were drafted to accurately reflect how Balaka currently operates, but they
          are not a substitute for professional legal advice. Given that Balaka processes
          payments and operates internationally, we recommend a qualified lawyer review these
          Terms before they are treated as final.
        </p>
      </div>
    </div>
  );
}
