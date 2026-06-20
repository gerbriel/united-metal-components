import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Privacy Policy | United Metal Components',
  description: 'Privacy policy for United Metal Components — how we collect, use, and protect your personal information under California law (CCPA/CPRA).',
}

const EFFECTIVE_DATE = 'January 1, 2025'
const COMPANY = 'United Metal Components'
const ADDRESS = '9191 W Whitesbridge Ave, Fresno, CA 93706'
const EMAIL = 'privacy@unitedmetalcomponents.com'
const PHONE = '(559) 555-5555'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
          Legal
        </span>
        <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Effective: {EFFECTIVE_DATE} &mdash; Last updated: {EFFECTIVE_DATE}</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

        <section>
          <p>
            {COMPANY} (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates this website and is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website or place an order with us.
          </p>
          <p className="mt-3">
            We are headquartered in California and comply with the <strong>California Consumer Privacy Act (CCPA)</strong> as amended by the <strong>California Privacy Rights Act (CPRA)</strong>, and other applicable state and federal privacy laws. If you are a California resident, please read Section 10 for your specific rights.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">1. Who We Are</h2>
          <p>{COMPANY} is a metal building materials supplier located at {ADDRESS}. We sell sheet metal panels, structural components, trusses, garage doors, and related construction materials. All sales are pickup only from our Fresno, CA facility.</p>
          <p className="mt-2">For privacy inquiries, contact our Privacy Officer at <a href={`mailto:${EMAIL}`} className="text-orange-500 hover:text-orange-600">{EMAIL}</a> or {PHONE}.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">2. Information We Collect</h2>
          <p className="mb-3">We collect personal information in the following categories:</p>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold mb-2">A. Information You Provide Directly</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Account information:</strong> Full name, email address, password (hashed)</li>
                <li><strong>Order information:</strong> Name, phone number, order notes</li>
                <li><strong>Contact form submissions:</strong> Name, email, phone, message content</li>
                <li><strong>Newsletter opt-in:</strong> Email address and name</li>
                <li><strong>Profile information:</strong> Phone, city, state, ZIP code</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold mb-2">B. Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><strong>Log data:</strong> IP address, browser type, pages visited, timestamps</li>
                <li><strong>Device information:</strong> Device type, operating system</li>
                <li><strong>Analytics events:</strong> Page views, product views, add-to-cart events (no cross-site tracking)</li>
                <li><strong>Session cookies:</strong> Authentication tokens stored in secure, httpOnly cookies</li>
              </ul>
            </div>

            <div className="bg-slate-50 rounded-xl p-5">
              <h3 className="font-semibold mb-2">C. Sensitive Personal Information</h3>
              <p className="text-muted-foreground">We do not intentionally collect sensitive personal information (e.g., Social Security numbers, financial account numbers, precise geolocation, racial/ethnic origin, health information, or biometric data). Do not submit such information through our site.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">3. How We Use Your Information</h2>
          <p className="mb-3">We use personal information only for the following business purposes:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Fulfilling orders:</strong> Processing pickup orders, notifying you when your order is ready, and maintaining order history</li>
            <li><strong>Account management:</strong> Creating and maintaining your account, authentication, and password recovery</li>
            <li><strong>Customer communication:</strong> Responding to contact form submissions, questions, and support requests</li>
            <li><strong>Marketing (opt-in only):</strong> Sending product updates and promotional emails to subscribers who have opted in</li>
            <li><strong>Security and fraud prevention:</strong> Rate limiting, abuse detection, and protecting our systems and customers</li>
            <li><strong>Legal compliance:</strong> Maintaining records as required by California law, tax records, and responding to lawful requests</li>
            <li><strong>Service improvement:</strong> Analyzing aggregate, anonymized data to improve our website and product offerings</li>
          </ul>
          <p className="mt-3 text-muted-foreground">We do not use your personal information for automated decision-making or profiling that produces legal or similarly significant effects.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">4. Sharing and Disclosure</h2>
          <p className="mb-3">We do not sell your personal information. We share personal information only in these circumstances:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Service providers:</strong> Supabase (database and authentication hosting), email delivery providers, and other vendors who process data on our behalf under written data processing agreements</li>
            <li><strong>Legal requirements:</strong> When required by law, court order, or government authority, or to protect our legal rights</li>
            <li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice provided to you</li>
            <li><strong>With your consent:</strong> For any other purpose with your explicit consent</li>
          </ul>
          <p className="mt-3 text-muted-foreground">We do not share your personal information with third-party advertisers or data brokers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">5. Cookies and Tracking</h2>
          <p className="mb-3">We use minimal, essential cookies:</p>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li><strong>Authentication cookies:</strong> Secure session tokens to keep you logged in (httpOnly, SameSite=Lax)</li>
            <li><strong>Preference cookies:</strong> Cart contents and UI preferences stored in browser localStorage</li>
          </ul>
          <p className="mt-3 text-muted-foreground">We do not use third-party advertising cookies, cross-site tracking pixels, or sell browsing data to data brokers. We do not use Google Analytics or Facebook Pixel on this site.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">6. Data Retention</h2>
          <p className="text-muted-foreground">We retain personal data for as long as necessary for the purposes described in this policy:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>Account data: until you delete your account, plus 30 days for recovery</li>
            <li>Order records: 7 years (California tax and business record requirements)</li>
            <li>Contact form messages: 2 years</li>
            <li>Newsletter subscriptions: until you unsubscribe</li>
            <li>Server logs: 90 days</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">7. Data Security</h2>
          <p className="text-muted-foreground">We implement reasonable technical and organizational security measures including:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-muted-foreground">
            <li>TLS/HTTPS encryption for all data in transit</li>
            <li>Passwords stored as bcrypt hashes (never in plaintext)</li>
            <li>Row-level security (RLS) policies limiting data access</li>
            <li>Rate limiting to prevent brute-force attacks</li>
            <li>Input sanitization and parameterized queries to prevent injection attacks</li>
            <li>Secure, httpOnly authentication cookies</li>
          </ul>
          <p className="mt-3 text-muted-foreground">No method of internet transmission or electronic storage is 100% secure. If you believe your account has been compromised, contact us immediately.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">8. Children&rsquo;s Privacy</h2>
          <p className="text-muted-foreground">Our services are intended for adults and businesses in the construction materials industry. We do not knowingly collect personal information from children under 16. If we learn we have collected such information, we will delete it promptly. Contact us at {EMAIL} if you believe a minor has provided us information.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">9. Third-Party Links</h2>
          <p className="text-muted-foreground">Our website may contain links to third-party websites (e.g., Google Maps for our location). We are not responsible for the privacy practices of those sites and recommend reviewing their privacy policies.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">10. California Residents — Your Rights (CCPA/CPRA)</h2>
          <p className="mb-3">If you are a California resident, you have the following rights under the CCPA as amended by the CPRA:</p>

          <div className="space-y-3">
            {[
              { right: 'Right to Know', desc: 'Request disclosure of the categories and specific pieces of personal information we have collected about you, the categories of sources, our purposes for collecting it, and categories of third parties we share it with.' },
              { right: 'Right to Delete', desc: 'Request deletion of personal information we have collected from you, subject to certain exceptions (e.g., completing transactions, complying with legal obligations).' },
              { right: 'Right to Correct', desc: 'Request correction of inaccurate personal information we maintain about you.' },
              { right: 'Right to Opt-Out of Sale/Sharing', desc: 'We do not sell or share personal information for cross-context behavioral advertising. You do not need to opt out.' },
              { right: 'Right to Limit Use of Sensitive Personal Information', desc: 'We do not collect or use sensitive personal information beyond what is necessary for our business purposes.' },
              { right: 'Right to Non-Discrimination', desc: 'We will not discriminate against you for exercising any of your privacy rights. You will receive the same quality of service regardless of whether you submit a privacy request.' },
            ].map(({ right, desc }) => (
              <div key={right} className="bg-slate-50 rounded-xl p-4">
                <p className="font-semibold text-sm">{right}</p>
                <p className="text-sm text-muted-foreground mt-1">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 p-5 bg-primary/5 border border-primary/20 rounded-xl">
            <h3 className="font-semibold mb-2">How to Submit a Request</h3>
            <p className="text-sm text-muted-foreground mb-3">To exercise any of these rights, submit a verifiable consumer request by:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>Email: <a href={`mailto:${EMAIL}`} className="text-orange-500 hover:text-orange-600">{EMAIL}</a></li>
              <li>Phone: <a href="tel:+15595555555" className="text-orange-500 hover:text-orange-600">{PHONE}</a></li>
              <li>Mail: {COMPANY}, {ADDRESS}, Attn: Privacy Officer</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-3">We will respond within <strong>45 days</strong>. We may extend this by an additional 45 days when reasonably necessary with prior notice. We verify your identity before processing requests.</p>
            <p className="text-sm text-muted-foreground mt-2">You may designate an authorized agent to submit a request on your behalf. We will require written authorization and verify your identity directly.</p>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">You may also contact the California Attorney General at <a href="https://oag.ca.gov/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-600">oag.ca.gov/privacy</a> to learn more about your rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">11. &ldquo;Do Not Track&rdquo; Signals</h2>
          <p className="text-muted-foreground">California law requires us to disclose how we respond to Do Not Track (DNT) signals from browsers. We do not currently respond to DNT signals because no industry standard for DNT compliance has been adopted. We do not engage in cross-site tracking regardless of DNT settings.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">12. Nevada Residents</h2>
          <p className="text-muted-foreground">Nevada residents may opt out of the sale of covered information. We do not sell covered information as defined under Nevada law. To submit an opt-out request regardless, contact us at {EMAIL}.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">13. Changes to This Policy</h2>
          <p className="text-muted-foreground">We may update this Privacy Policy periodically. We will post the updated policy on this page with a revised effective date. For material changes, we will provide notice via email (if you have an account) or a prominent notice on our website at least 30 days before changes take effect.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">14. Contact Us</h2>
          <div className="bg-slate-50 rounded-xl p-5 text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{COMPANY} — Privacy Officer</p>
            <p>{ADDRESS}</p>
            <p>Email: <a href={`mailto:${EMAIL}`} className="text-orange-500 hover:text-orange-600">{EMAIL}</a></p>
            <p>Phone: <a href="tel:+15595555555" className="text-orange-500 hover:text-orange-600">{PHONE}</a></p>
          </div>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4">
        <ButtonLink href="/terms" variant="outline" size="sm">Terms of Service</ButtonLink>
        <ButtonLink href="/contact" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">Contact Us</ButtonLink>
      </div>
    </div>
  )
}
