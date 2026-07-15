// The current Privacy Policy / Terms of Service content as HTML, used to
// PREFILL the admin editors (Site Content) so an admin edits from the existing
// text instead of a blank field. The public pages keep their own built-in
// rendering as the fallback until an admin saves an override.

const COMPANY = 'United Metal Components'
const ADDRESS = '9191 W Whitesbridge Ave, Fresno, CA 93706'
const EMAIL = 'sales@unitedmetalcomponents.com'
const PHONE = '(559) 567-9117'
const EFFECTIVE = 'January 1, 2025'

export const DEFAULT_PRIVACY_HTML = `
<p><em>Effective: ${EFFECTIVE} — Last updated: ${EFFECTIVE}</em></p>
<p>${COMPANY} (“Company,” “we,” “us,” or “our”) operates this website and is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you visit our website or place an order with us.</p>
<p>We are headquartered in California and comply with the <strong>California Consumer Privacy Act (CCPA)</strong> as amended by the <strong>California Privacy Rights Act (CPRA)</strong>, and other applicable state and federal privacy laws. If you are a California resident, please read Section 10 for your specific rights.</p>

<h2>1. Who We Are</h2>
<p>${COMPANY} is a metal building materials supplier located at ${ADDRESS}. We sell sheet metal panels, structural components, trusses, garage doors, and related construction materials. All sales are pickup only from our Fresno, CA facility.</p>
<p>For privacy inquiries, contact our Privacy Officer at <a href="mailto:${EMAIL}">${EMAIL}</a> or ${PHONE}.</p>

<h2>2. Information We Collect</h2>
<p>We collect personal information in the following categories:</p>
<h3>A. Information You Provide Directly</h3>
<ul>
<li><strong>Account information:</strong> Full name, email address, password (hashed)</li>
<li><strong>Order information:</strong> Name, phone number, order notes</li>
<li><strong>Contact form submissions:</strong> Name, email, phone, message content</li>
<li><strong>Newsletter opt-in:</strong> Email address and name</li>
<li><strong>Profile information:</strong> Phone, city, state, ZIP code</li>
</ul>
<h3>B. Information Collected Automatically</h3>
<ul>
<li><strong>Log data:</strong> IP address, browser type, pages visited, timestamps</li>
<li><strong>Device information:</strong> Device type, operating system</li>
<li><strong>Analytics events:</strong> Page views, product views, add-to-cart events (no cross-site tracking)</li>
<li><strong>Session cookies:</strong> Authentication tokens stored in secure, httpOnly cookies</li>
</ul>
<h3>C. Sensitive Personal Information</h3>
<p>We do not intentionally collect sensitive personal information (e.g., Social Security numbers, financial account numbers, precise geolocation, racial/ethnic origin, health information, or biometric data). Do not submit such information through our site.</p>

<h2>3. How We Use Your Information</h2>
<p>We use personal information only for the following business purposes:</p>
<ul>
<li><strong>Fulfilling orders:</strong> Processing pickup orders, notifying you when your order is ready, and maintaining order history</li>
<li><strong>Account management:</strong> Creating and maintaining your account, authentication, and password recovery</li>
<li><strong>Customer communication:</strong> Responding to contact form submissions, questions, and support requests</li>
<li><strong>Marketing (opt-in only):</strong> Sending product updates and promotional emails to subscribers who have opted in</li>
<li><strong>Security and fraud prevention:</strong> Rate limiting, abuse detection, and protecting our systems and customers</li>
<li><strong>Legal compliance:</strong> Maintaining records as required by California law, tax records, and responding to lawful requests</li>
<li><strong>Service improvement:</strong> Analyzing aggregate, anonymized data to improve our website and product offerings</li>
</ul>
<p>We do not use your personal information for automated decision-making or profiling that produces legal or similarly significant effects.</p>

<h2>4. Sharing and Disclosure</h2>
<p>We do not sell your personal information. We share personal information only in these circumstances:</p>
<ul>
<li><strong>Service providers:</strong> Supabase (database and authentication hosting), email service providers, and other vendors who process data on our behalf under written data processing agreements</li>
<li><strong>Legal requirements:</strong> When required by law, court order, or government authority, or to protect our legal rights</li>
<li><strong>Business transfers:</strong> In connection with a merger, acquisition, or sale of assets, with notice provided to you</li>
<li><strong>With your consent:</strong> For any other purpose with your explicit consent</li>
</ul>
<p>We do not share your personal information with third-party advertisers or data brokers.</p>

<h2>5. Cookies and Tracking</h2>
<p>We use minimal, essential cookies:</p>
<ul>
<li><strong>Authentication cookies:</strong> Secure session tokens to keep you logged in (httpOnly, SameSite=Lax)</li>
<li><strong>Preference cookies:</strong> Cart contents and UI preferences stored in browser localStorage</li>
</ul>
<p>We do not use third-party advertising cookies, cross-site tracking pixels, or sell browsing data to data brokers. We do not use Google Analytics or Facebook Pixel on this site.</p>

<h2>6. Data Retention</h2>
<p>We retain personal data for as long as necessary for the purposes described in this policy:</p>
<ul>
<li>Account data: until you delete your account, plus 30 days for recovery</li>
<li>Order records: 7 years (California tax and business record requirements)</li>
<li>Contact form messages: 2 years</li>
<li>Newsletter subscriptions: until you unsubscribe</li>
<li>Server logs: 90 days</li>
</ul>

<h2>7. Data Security</h2>
<p>We implement reasonable technical and organizational security measures including:</p>
<ul>
<li>TLS/HTTPS encryption for all data in transit</li>
<li>Passwords stored as bcrypt hashes (never in plaintext)</li>
<li>Row-level security (RLS) policies limiting data access</li>
<li>Rate limiting to prevent brute-force attacks</li>
<li>Input sanitization and parameterized queries to prevent injection attacks</li>
<li>Secure, httpOnly authentication cookies</li>
</ul>
<p>No method of internet transmission or electronic storage is 100% secure. If you believe your account has been compromised, contact us immediately.</p>

<h2>8. Children’s Privacy</h2>
<p>Our services are intended for adults and businesses in the construction materials industry. We do not knowingly collect personal information from children under 16. If we learn we have collected such information, we will delete it promptly. Contact us at ${EMAIL} if you believe a minor has provided us information.</p>

<h2>9. Third-Party Links</h2>
<p>Our website may contain links to third-party websites (e.g., Google Maps for our location). We are not responsible for the privacy practices of those sites and recommend reviewing their privacy policies.</p>

<h2>10. California Residents — Your Rights (CCPA/CPRA)</h2>
<p>If you are a California resident, you have the following rights under the CCPA as amended by the CPRA:</p>
<ul>
<li><strong>Right to Know:</strong> Request disclosure of the categories and specific pieces of personal information we have collected about you, the categories of sources, our purposes for collecting it, and categories of third parties we share it with.</li>
<li><strong>Right to Delete:</strong> Request deletion of personal information we have collected from you, subject to certain exceptions (e.g., completing transactions, complying with legal obligations).</li>
<li><strong>Right to Correct:</strong> Request correction of inaccurate personal information we maintain about you.</li>
<li><strong>Right to Opt-Out of Sale/Sharing:</strong> We do not sell or share personal information for cross-context behavioral advertising. You do not need to opt out.</li>
<li><strong>Right to Limit Use of Sensitive Personal Information:</strong> We do not collect or use sensitive personal information beyond what is necessary for our business purposes.</li>
<li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising any of your privacy rights.</li>
</ul>
<h3>How to Submit a Request</h3>
<p>To exercise any of these rights, submit a verifiable consumer request by Email: <a href="mailto:${EMAIL}">${EMAIL}</a>; Phone: ${PHONE}; or Mail: ${COMPANY}, ${ADDRESS}, Attn: Privacy Officer.</p>
<p>We will respond within <strong>45 days</strong>. We may extend this by an additional 45 days when reasonably necessary with prior notice. We verify your identity before processing requests. You may designate an authorized agent to submit a request on your behalf.</p>
<p>You may also contact the California Attorney General at <a href="https://oag.ca.gov/privacy" target="_blank" rel="noopener noreferrer">oag.ca.gov/privacy</a> to learn more about your rights.</p>

<h2>11. “Do Not Track” Signals</h2>
<p>California law requires us to disclose how we respond to Do Not Track (DNT) signals from browsers. We do not currently respond to DNT signals because no industry standard for DNT compliance has been adopted. We do not engage in cross-site tracking regardless of DNT settings.</p>

<h2>12. Nevada Residents</h2>
<p>Nevada residents may opt out of the sale of covered information. We do not sell covered information as defined under Nevada law. To submit an opt-out request regardless, contact us at ${EMAIL}.</p>

<h2>13. Changes to This Policy</h2>
<p>We may update this Privacy Policy periodically. We will post the updated policy on this page with a revised effective date. For material changes, we will provide notice via email (if you have an account) or a prominent notice on our website at least 30 days before changes take effect.</p>

<h2>14. Contact Us</h2>
<p><strong>${COMPANY} — Privacy Officer</strong><br>${ADDRESS}<br>Email: <a href="mailto:${EMAIL}">${EMAIL}</a><br>Phone: ${PHONE}</p>
`.trim()

export const DEFAULT_TERMS_HTML = `
<p><em>Effective: ${EFFECTIVE} — Last updated: ${EFFECTIVE}</em></p>
<p>Please read these Terms of Service (“Terms”) carefully before using the website operated by ${COMPANY} (“Company,” “we,” “us,” or “our”).</p>
<p>By accessing our website or placing an order, you agree to be bound by these Terms. If you do not agree, do not use our services. These Terms constitute a legally binding agreement under the laws of the <strong>State of California</strong>.</p>

<h2>1. About Our Business</h2>
<p>${COMPANY} is a metal building materials supplier located at ${ADDRESS}. We sell sheet metal panels, structural tubing, trusses, carport kits, garage doors, anchors, moisture barrier, and related construction materials to contractors, businesses, and individuals.</p>
<p><strong>All orders are pickup only.</strong> Orders must be picked up at our Fresno facility during business hours.</p>

<h2>2. Account Registration</h2>
<ul>
<li>You must be at least 18 years old to create an account or place an order.</li>
<li>You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</li>
<li>You agree to provide accurate and complete information when registering.</li>
<li>You must verify your email address before your account is fully activated.</li>
<li>We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are involved in fraudulent activity.</li>
</ul>

<h2>3. Orders and Pricing</h2>
<h3>3.1 Placing Orders</h3>
<p>Orders placed through our website are offers to purchase subject to our acceptance. We reserve the right to decline any order for any reason, including pricing errors, availability, or suspected fraud. You will receive an email confirmation when your order is accepted.</p>
<h3>3.2 Pricing</h3>
<p>All prices are listed in U.S. dollars. Prices are subject to change without notice. Applicable California sales tax (currently 8.25% in our jurisdiction) will be added to all orders at checkout. Pricing errors will be corrected before orders are fulfilled, and you will be notified and given the option to cancel if the corrected price is higher than displayed.</p>
<h3>3.3 Availability</h3>
<p>Product availability is not guaranteed. In the event that an item you ordered is out of stock after your order is placed, we will notify you promptly and provide options including a full refund, substitution, or backorder.</p>
<h3>3.4 Order Modifications and Cancellations</h3>
<p>Orders may be modified or cancelled by contacting us at ${PHONE} or ${EMAIL} before the order has been pulled and staged for pickup. We cannot guarantee cancellations or modifications once order preparation has begun.</p>

<h2>4. Pickup Policy</h2>
<p><strong>Pickup Address:</strong> ${ADDRESS}<br>Monday – Friday: 7:00 AM – 5:00 PM<br>Saturday: 8:00 AM – 12:00 PM<br>Sunday: Closed</p>
<ul>
<li>You will receive a notification (email and/or in-app) when your order is ready for pickup — typically within 1 business day.</li>
<li>Bring your order confirmation (email or phone screen) and a valid government-issued photo ID.</li>
<li>An authorized representative may pick up on your behalf with prior written authorization and their own photo ID.</li>
<li>We hold ready orders for up to <strong>7 business days</strong>. After that period, we may charge a storage fee of $25/day or cancel the order. We will contact you before taking either action.</li>
<li>You are responsible for bringing appropriate equipment (truck, flatbed trailer, straps) to safely transport your materials. We are not responsible for damage resulting from inadequate transport.</li>
<li>Our staff will assist with loading when reasonably practicable, but final responsibility for securing the load rests with you.</li>
</ul>

<h2>5. Payment</h2>
<p>Payment is processed at the time of order placement through our online checkout. We accept major credit and debit cards. By submitting payment, you authorize us to charge the provided payment method for the full order total including applicable taxes.</p>
<p>All payment processing is handled by our payment processor. We do not store full credit card numbers on our servers.</p>

<h2>6. Returns, Refunds, and Defective Products</h2>
<h3>6.1 Returns</h3>
<p>Unused, uncut products in original condition may be returned within <strong>30 days</strong> of pickup with proof of purchase. Items must be returned to our facility. Custom-cut materials, special orders, and clearance items are final sale.</p>
<h3>6.2 Refunds</h3>
<p>Approved refunds will be issued to the original payment method within 5–10 business days. Restocking fees of up to 15% may apply for non-defective returns.</p>
<h3>6.3 Defective Products</h3>
<p>If a product is defective or was incorrectly supplied, contact us within <strong>7 days</strong> of pickup at ${EMAIL} with photos and your order number. We will arrange a replacement or full refund at no cost to you.</p>
<h3>6.4 Damaged at Pickup</h3>
<p>Inspect all materials before leaving our facility. Any visible damage must be noted on your pickup receipt and reported to our staff immediately. Claims for damage discovered after leaving the facility may be limited.</p>

<h2>7. Product Information and Professional Advice</h2>
<p>Product descriptions, specifications, and dimensions are provided for informational purposes. We make reasonable efforts to ensure accuracy but do not warrant that all descriptions are error-free.</p>
<p><strong>You are responsible for ensuring materials meet the requirements of your project.</strong> Nothing on this website constitutes engineering advice, structural calculations, or building code compliance guidance. Consult a licensed engineer or contractor for structural applications.</p>

<h2>8. Intellectual Property</h2>
<p>All content on this website — including text, images, logos, product descriptions, and software — is the property of ${COMPANY} or its licensors and is protected by U.S. and California intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.</p>

<h2>9. Prohibited Use</h2>
<p>You agree not to:</p>
<ul>
<li>Use our website for any unlawful purpose or in violation of any applicable law</li>
<li>Submit false, misleading, or fraudulent orders or information</li>
<li>Attempt to gain unauthorized access to our systems or other users’ accounts</li>
<li>Scrape, crawl, or automatically extract data from our website without written permission</li>
<li>Interfere with the operation of our website or infrastructure</li>
<li>Impersonate any person or entity</li>
</ul>

<h2>10. Disclaimer of Warranties</h2>
<p>OUR WEBSITE AND SERVICES ARE PROVIDED “AS IS” AND “AS AVAILABLE” WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. WE DO NOT WARRANT THAT OUR WEBSITE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES.</p>
<p>Manufacturer warranties on products pass through to you as the end purchaser. Contact us for specific warranty information on any product.</p>

<h2>11. Limitation of Liability</h2>
<p>TO THE FULLEST EXTENT PERMITTED BY CALIFORNIA LAW, ${COMPANY.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OUR WEBSITE OR SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
<p>OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS OR YOUR USE OF OUR SERVICES SHALL NOT EXCEED THE AMOUNT PAID BY YOU FOR THE SPECIFIC ORDER GIVING RISE TO THE CLAIM.</p>
<p>Some states, including California, do not allow the exclusion of certain warranties or limitation of liability for certain types of damages. In such cases, our liability is limited to the minimum extent permitted by applicable law.</p>

<h2>12. Indemnification</h2>
<p>You agree to indemnify, defend, and hold harmless ${COMPANY} and its officers, directors, employees, and agents from any claims, damages, losses, liabilities, costs, and expenses (including attorneys’ fees) arising from: (a) your use of our website or services; (b) your violation of these Terms; (c) your violation of any law or the rights of a third party; or (d) your misuse of our products.</p>

<h2>13. Governing Law and Dispute Resolution</h2>
<p>These Terms are governed by the laws of the <strong>State of California</strong>, without regard to its conflict of law provisions. The United Nations Convention on Contracts for the International Sale of Goods does not apply.</p>
<p>Any dispute arising from these Terms or your use of our services shall first be resolved through good-faith negotiation. If not resolved within 30 days, disputes shall be submitted to <strong>binding arbitration</strong> in Fresno County, California, under the rules of the American Arbitration Association (AAA) Commercial Rules, except that either party may seek injunctive relief in any court of competent jurisdiction.</p>
<p><strong>Class action waiver:</strong> You waive any right to bring or participate in any class action lawsuit or class-wide arbitration against ${COMPANY}.</p>
<p>If arbitration is not enforceable, disputes shall be resolved exclusively in the state or federal courts located in Fresno County, California, and you consent to personal jurisdiction in those courts.</p>

<h2>14. California-Specific Rights</h2>
<p>Under California Civil Code Section 1789.3, California residents are entitled to the following consumer rights notice: The Complaint Assistance Unit of the Division of Consumer Services of the California Department of Consumer Affairs may be contacted in writing at 1625 North Market Blvd., Suite N 112, Sacramento, CA 95834, or by telephone at (916) 445-1254 or (800) 952-5210.</p>

<h2>15. Electronic Communications</h2>
<p>By creating an account, you consent to receive electronic communications from us regarding your account and orders. These electronic communications satisfy any legal requirement that such communications be in writing. You may opt out of marketing communications at any time via the unsubscribe link in any marketing email or by contacting us.</p>

<h2>16. Severability and Waiver</h2>
<p>If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force. Our failure to enforce any right or provision of these Terms shall not constitute a waiver of that right or provision.</p>

<h2>17. Changes to These Terms</h2>
<p>We reserve the right to modify these Terms at any time. We will notify registered users of material changes via email at least 30 days before changes take effect. Your continued use of our services after changes take effect constitutes acceptance of the revised Terms. We encourage you to review these Terms periodically.</p>

<h2>18. Contact Information</h2>
<p><strong>${COMPANY}</strong><br>${ADDRESS}<br>Email: <a href="mailto:${EMAIL}">${EMAIL}</a><br>Phone: ${PHONE}<br>Business Hours: Mon–Fri 7am–5pm, Sat 8am–12pm (Pacific Time)</p>
`.trim()
