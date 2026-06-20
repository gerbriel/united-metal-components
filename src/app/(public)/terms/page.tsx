import type { Metadata } from 'next'
import { ButtonLink } from '@/components/ui/button-link'

export const metadata: Metadata = {
  title: 'Terms of Service | United Metal Components',
  description: 'Terms and conditions for purchasing metal building materials from United Metal Components in Fresno, CA.',
}

const EFFECTIVE_DATE = 'January 1, 2025'
const COMPANY = 'United Metal Components'
const ADDRESS = '9191 W Whitesbridge Ave, Fresno, CA 93706'
const EMAIL = 'legal@unitedmetalcomponents.com'
const PHONE = '(559) 555-5555'

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3 block">
          Legal
        </span>
        <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Effective: {EFFECTIVE_DATE} &mdash; Last updated: {EFFECTIVE_DATE}</p>
      </div>

      <div className="prose prose-slate max-w-none text-sm leading-relaxed space-y-8">

        <section>
          <p>
            Please read these Terms of Service (&ldquo;Terms&rdquo;) carefully before using the website operated by {COMPANY} (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
          </p>
          <p className="mt-3">
            By accessing our website or placing an order, you agree to be bound by these Terms. If you do not agree, do not use our services. These Terms constitute a legally binding agreement under the laws of the <strong>State of California</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">1. About Our Business</h2>
          <p className="text-muted-foreground">
            {COMPANY} is a metal building materials supplier located at {ADDRESS}. We sell sheet metal panels, structural tubing, trusses, carport kits, garage doors, anchors, insulation, and related construction materials to contractors, businesses, and individuals.
          </p>
          <p className="mt-2 text-muted-foreground">
            <strong>All orders are pickup only.</strong> We do not offer delivery or shipping. Orders must be picked up at our Fresno facility during business hours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">2. Account Registration</h2>
          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You must be at least 18 years old to create an account or place an order.</li>
            <li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
            <li>You agree to provide accurate and complete information when registering.</li>
            <li>You must verify your email address before your account is fully activated.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are involved in fraudulent activity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">3. Orders and Pricing</h2>

          <h3 className="font-semibold mt-4 mb-2">3.1 Placing Orders</h3>
          <p className="text-muted-foreground">Orders placed through our website are offers to purchase subject to our acceptance. We reserve the right to decline any order for any reason, including pricing errors, availability, or suspected fraud. You will receive an email confirmation when your order is accepted.</p>

          <h3 className="font-semibold mt-4 mb-2">3.2 Pricing</h3>
          <p className="text-muted-foreground">All prices are listed in U.S. dollars. Prices are subject to change without notice. Applicable California sales tax (currently 8.25% in our jurisdiction) will be added to all orders at checkout. Pricing errors will be corrected before orders are fulfilled, and you will be notified and given the option to cancel if the corrected price is higher than displayed.</p>

          <h3 className="font-semibold mt-4 mb-2">3.3 Availability</h3>
          <p className="text-muted-foreground">Product availability is not guaranteed. In the event that an item you ordered is out of stock after your order is placed, we will notify you promptly and provide options including a full refund, substitution, or backorder.</p>

          <h3 className="font-semibold mt-4 mb-2">3.4 Order Modifications and Cancellations</h3>
          <p className="text-muted-foreground">Orders may be modified or cancelled by contacting us at {PHONE} or {EMAIL} before the order has been pulled and staged for pickup. We cannot guarantee cancellations or modifications once order preparation has begun.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">4. Pickup Policy</h2>

          <div className="bg-slate-50 rounded-xl p-5 mb-4">
            <p className="font-semibold mb-1">Pickup Address</p>
            <p className="text-muted-foreground">{ADDRESS}</p>
            <p className="text-muted-foreground mt-2">
              Monday – Friday: 7:00 AM – 5:00 PM<br />
              Saturday: 8:00 AM – 12:00 PM<br />
              Sunday: Closed
            </p>
          </div>

          <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
            <li>You will receive a notification (email and/or in-app) when your order is ready for pickup — typically within 1 business day.</li>
            <li>Bring your order confirmation (email or phone screen) and a valid government-issued photo ID.</li>
            <li>An authorized representative may pick up on your behalf with prior written authorization and their own photo ID.</li>
            <li>We hold ready orders for up to <strong>7 business days</strong>. After that period, we may charge a storage fee of $25/day or cancel the order. We will contact you before taking either action.</li>
            <li>You are responsible for bringing appropriate equipment (truck, flatbed trailer, straps) to safely transport your materials. We are not responsible for damage resulting from inadequate transport.</li>
            <li>Our staff will assist with loading when reasonably practicable, but final responsibility for securing the load rests with you.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">5. Payment</h2>
          <p className="text-muted-foreground">Payment is processed at the time of order placement through our online checkout. We accept major credit and debit cards. By submitting payment, you authorize us to charge the provided payment method for the full order total including applicable taxes.</p>
          <p className="mt-2 text-muted-foreground">All payment processing is handled by our payment processor. We do not store full credit card numbers on our servers.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">6. Returns, Refunds, and Defective Products</h2>

          <h3 className="font-semibold mt-4 mb-2">6.1 Returns</h3>
          <p className="text-muted-foreground">Unused, uncut products in original condition may be returned within <strong>30 days</strong> of pickup with proof of purchase. Items must be returned to our facility. Custom-cut materials, special orders, and clearance items are final sale.</p>

          <h3 className="font-semibold mt-4 mb-2">6.2 Refunds</h3>
          <p className="text-muted-foreground">Approved refunds will be issued to the original payment method within 5–10 business days. Restocking fees of up to 15% may apply for non-defective returns.</p>

          <h3 className="font-semibold mt-4 mb-2">6.3 Defective Products</h3>
          <p className="text-muted-foreground">If a product is defective or was incorrectly supplied, contact us within <strong>7 days</strong> of pickup at {EMAIL} with photos and your order number. We will arrange a replacement or full refund at no cost to you.</p>

          <h3 className="font-semibold mt-4 mb-2">6.4 Damaged at Pickup</h3>
          <p className="text-muted-foreground">Inspect all materials before leaving our facility. Any visible damage must be noted on your pickup receipt and reported to our staff immediately. Claims for damage discovered after leaving the facility may be limited.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">7. Product Information and Professional Advice</h2>
          <p className="text-muted-foreground">Product descriptions, specifications, and dimensions are provided for informational purposes. We make reasonable efforts to ensure accuracy but do not warrant that all descriptions are error-free.</p>
          <p className="mt-2 text-muted-foreground"><strong>You are responsible for ensuring materials meet the requirements of your project.</strong> Nothing on this website constitutes engineering advice, structural calculations, or building code compliance guidance. Consult a licensed engineer or contractor for structural applications.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">8. Intellectual Property</h2>
          <p className="text-muted-foreground">All content on this website — including text, images, logos, product descriptions, and software — is the property of {COMPANY} or its licensors and is protected by U.S. and California intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">9. Prohibited Use</h2>
          <p className="mb-2 text-muted-foreground">You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Use our website for any unlawful purpose or in violation of any applicable law</li>
            <li>Submit false, misleading, or fraudulent orders or information</li>
            <li>Attempt to gain unauthorized access to our systems or other users&rsquo; accounts</li>
            <li>Scrape, crawl, or automatically extract data from our website without written permission</li>
            <li>Interfere with the operation of our website or infrastructure</li>
            <li>Impersonate any person or entity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">10. Disclaimer of Warranties</h2>
          <p className="text-muted-foreground">
            OUR WEBSITE AND SERVICES ARE PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT OUR WEBSITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES.
          </p>
          <p className="mt-3 text-muted-foreground">
            Manufacturer warranties on products pass through to you as the end purchaser. Contact us for specific warranty information on any product.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">11. Limitation of Liability</h2>
          <p className="text-muted-foreground">
            TO THE FULLEST EXTENT PERMITTED BY CALIFORNIA LAW, {COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OUR WEBSITE OR SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="mt-3 text-muted-foreground">
            OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF OUR SERVICES SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SPECIFIC ORDER GIVING RISE TO THE CLAIM.
          </p>
          <p className="mt-3 text-muted-foreground">
            Some states, including California, do not allow the exclusion of certain warranties or limitation of liability for certain types of damages. In such cases, our liability is limited to the minimum extent permitted by applicable law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">12. Indemnification</h2>
          <p className="text-muted-foreground">You agree to indemnify, defend, and hold harmless {COMPANY} and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including attorneys&rsquo; fees) arising from: (a) your use of our website or services; (b) your violation of these Terms; (c) your violation of any law or the rights of a third party; or (d) your misuse of our products.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">13. Governing Law and Dispute Resolution</h2>
          <p className="text-muted-foreground">These Terms are governed by the laws of the <strong>State of California</strong>, without regard to its conflict of law provisions. The United Nations Convention on Contracts for the International Sale of Goods does not apply.</p>
          <p className="mt-3 text-muted-foreground">Any dispute arising from these Terms or your use of our services shall first be resolved through good-faith negotiation. If not resolved within 30 days, disputes shall be submitted to <strong>binding arbitration</strong> in Fresno County, California, under the rules of the American Arbitration Association (AAA) Commercial Rules, except that either party may seek injunctive relief in any court of competent jurisdiction.</p>
          <p className="mt-3 text-muted-foreground"><strong>Class action waiver:</strong> You waive any right to bring or participate in any class action lawsuit or class-wide arbitration against {COMPANY}.</p>
          <p className="mt-3 text-muted-foreground">If arbitration is not enforceable, disputes shall be resolved exclusively in the state or federal courts located in Fresno County, California, and you consent to personal jurisdiction in those courts.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">14. California-Specific Rights</h2>
          <p className="text-muted-foreground">Under California Civil Code Section 1789.3, California residents are entitled to the following consumer rights notice: The Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs may be contacted in writing at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by telephone at (916) 445-1254 or (800) 952-5210.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">15. Electronic Communications</h2>
          <p className="text-muted-foreground">By creating an account, you consent to receive electronic communications from us regarding your account and orders. These electronic communications satisfy any legal requirement that such communications be in writing. You may opt out of marketing communications at any time via the unsubscribe link in any marketing email or by contacting us.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">16. Severability and Waiver</h2>
          <p className="text-muted-foreground">If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">17. Changes to These Terms</h2>
          <p className="text-muted-foreground">We reserve the right to modify these Terms at any time. We will notify registered users of material changes via email at least 30 days before changes take effect. Your continued use of our services after changes take effect constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold mb-3 text-foreground">18. Contact Information</h2>
          <div className="bg-slate-50 rounded-xl p-5 text-sm text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">{COMPANY}</p>
            <p>{ADDRESS}</p>
            <p>Email: <a href={`mailto:${EMAIL}`} className="text-orange-500 hover:text-orange-600">{EMAIL}</a></p>
            <p>Phone: <a href="tel:+15595555555" className="text-orange-500 hover:text-orange-600">{PHONE}</a></p>
            <p className="mt-2 text-xs">Business Hours: Mon–Fri 7am–5pm, Sat 8am–12pm (Pacific Time)</p>
          </div>
        </section>

      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 flex gap-4">
        <ButtonLink href="/privacy" variant="outline" size="sm">Privacy Policy</ButtonLink>
        <ButtonLink href="/contact" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white border-0">Contact Us</ButtonLink>
      </div>
    </div>
  )
}
