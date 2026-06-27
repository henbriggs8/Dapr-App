import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/icon";

const LAST_UPDATED = "June 26, 2026";
const PRIVACY_EMAIL = "privacy@autodapr.com";
const COMPANY_NAME = "Dapr Services LLC";
const APP_NAME = "Dapr";

interface SectionProps {
  number: string;
  title: string;
  children: React.ReactNode;
}

function Section({ number, title, children }: SectionProps) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold text-black mb-3">
        {number}. {title}
      </h2>
      <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-4">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="text-[#8c52ff] mt-0.5 flex-shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => window.history.back()}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Icon icon={ArrowLeft} size="md" className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-black">Privacy Policy</h1>
          <p className="text-xs text-gray-400">Last updated {LAST_UPDATED}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-8 pb-20">
        {/* Intro */}
        <p className="text-sm text-gray-600 leading-relaxed mb-10">
          {APP_NAME}, operated by {COMPANY_NAME} ("{APP_NAME}," "Dapr," "we," "our," or "us"), respects your privacy.
          This Privacy Policy explains how we collect, use, share, and protect your information when you use our website,
          mobile application, booking platform, payment checkout, or related services.
          By using {APP_NAME}, you agree to the practices described in this Privacy Policy.
        </p>

        <Section number="1" title="Information We Collect">
          <p>We collect information you provide directly, information collected automatically, and information from third-party services that help us operate {APP_NAME}.</p>

          <div>
            <p className="font-medium text-black mb-2">Information You Provide</p>
            <p className="mb-2">When you create an account, book a service, contact support, or use {APP_NAME}, we may collect:</p>
            <BulletList items={[
              "Name",
              "Phone number",
              "Email address",
              "Vehicle information, such as year, make, model, color, license plate, or photos if provided",
              "Service address or appointment location",
              "Booking details, including selected service, add-ons, appointment time, and special instructions",
              "Payment-related information",
              "Customer support messages",
              "Reviews, ratings, notes, or feedback",
              "Promo code, referral, or membership information",
            ]} />
          </div>

          <div>
            <p className="font-medium text-black mb-2">Location and Service Address Information</p>
            <p className="mb-2">{APP_NAME} uses location information to provide mobile car care services, match customers with available service providers, show service availability, estimate arrival times, and complete bookings. We may collect:</p>
            <BulletList items={[
              "The address you enter for a service",
              "Approximate location based on your device or browser, if you allow it",
              "Service provider location while they are actively completing or traveling to a job",
              "Appointment-related location history, such as pickup, arrival, and completion status",
            ]} />
            <p className="mt-2">You may disable device location permissions in your device settings, but some features may not work properly without location access.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">Payment Information</p>
            <p>Payments may be processed by third-party payment providers, including Stripe. We do not store full credit card numbers on our own systems. Payment processors may collect and process payment information, billing details, fraud-prevention information, and transaction history according to their own privacy policies.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">Information Collected Automatically</p>
            <p className="mb-2">When you use {APP_NAME}, we may automatically collect:</p>
            <BulletList items={[
              "Device type and browser type",
              "IP address and approximate location derived from IP address",
              "App usage activity, pages or screens viewed, and booking flow activity",
              "Error logs and analytics data",
              "Referral source",
              "Cookies or similar tracking technologies",
            ]} />
            <p className="mt-2">This information helps us improve the app, prevent fraud, troubleshoot issues, and understand how customers use {APP_NAME}.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">Information From Service Providers</p>
            <p className="mb-2">If you are a detailer, contractor, employee, franchise partner, or service provider using {APP_NAME}, we may also collect:</p>
            <BulletList items={[
              "Name, phone number, email address, and profile photo",
              "Vehicle or equipment information and work availability",
              "Service history, ratings, and customer feedback",
              "Job location while actively using the provider side of the platform",
              "Payout or tax-related information, if applicable",
              "Background, insurance, certification, or eligibility information, if required",
            ]} />
          </div>
        </Section>

        <Section number="2" title="How We Use Your Information">
          <p>We use your information to:</p>
          <BulletList items={[
            "Create and manage user accounts",
            "Book and manage mobile detailing or car care services",
            "Process payments, deposits, refunds, tips, and invoices",
            "Match customers with available service providers",
            "Send booking confirmations, reminders, updates, receipts, and support messages",
            "Show estimated arrival and completion times",
            "Improve app performance and customer experience",
            "Personalize offers, promotions, and service recommendations",
            "Prevent fraud, abuse, unauthorized access, or unsafe activity",
            "Resolve disputes, support requests, and service issues",
            "Analyze business performance and service demand",
            "Comply with legal, tax, insurance, and regulatory obligations",
            "Enforce our Terms of Service and other agreements",
          ]} />
        </Section>

        <Section number="3" title="How We Share Information">
          <p>We do not sell your personal information. We may share information in the following limited situations:</p>

          <div>
            <p className="font-medium text-black mb-2">With Service Providers and Detailers</p>
            <p>We may share customer booking information with the detailer or service provider assigned to your job, including your name, service address, phone number, vehicle information, selected service, appointment details, and special instructions.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">With Payment Processors</p>
            <p>We share payment-related information with payment processors such as Stripe to process payments, deposits, tips, refunds, invoices, and receipts.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">With Technology Providers</p>
            <p className="mb-2">We may share information with companies that help us operate {APP_NAME}, including providers for:</p>
            <BulletList items={[
              "Authentication and login",
              "Payment processing",
              "Hosting and cloud storage",
              "SMS, email, and push notifications",
              "Analytics and customer support",
              "Fraud prevention",
              "Scheduling and booking",
              "Maps and location services",
            ]} />
          </div>

          <div>
            <p className="font-medium text-black mb-2">For Legal or Safety Reasons</p>
            <p>We may disclose information if required to do so by law, court order, subpoena, legal process, or government request, or when we believe it is necessary to protect our rights, property, users, service providers, or the public.</p>
          </div>

          <div>
            <p className="font-medium text-black mb-2">Business Transfers</p>
            <p>If {APP_NAME} or {COMPANY_NAME} is involved in a merger, acquisition, financing, sale of assets, restructuring, or similar transaction, user information may be transferred as part of that transaction.</p>
          </div>
        </Section>

        <Section number="4" title="Third-Party Services">
          <p>{APP_NAME} may use third-party services such as:</p>
          <BulletList items={[
            "Stripe for payments",
            "Clerk for authentication and account management",
            "Google Maps, Apple Maps, or similar tools for location and routing",
            "Email, SMS, or notification providers",
            "Analytics and performance tools",
            "Hosting and database providers",
          ]} />
          <p>These third parties may collect and process information according to their own privacy policies. We encourage you to review their privacy policies to understand how they handle your information.</p>
        </Section>

        <Section number="5" title="Cookies and Tracking Technologies">
          <p>We may use cookies, pixels, software development kits, local storage, and similar technologies to:</p>
          <BulletList items={[
            "Keep you signed in",
            "Remember preferences",
            "Improve app functionality",
            "Analyze traffic and usage",
            "Measure marketing performance",
            "Prevent fraud and abuse",
          ]} />
          <p>You may be able to disable cookies through your browser settings, but some parts of {APP_NAME} may not work correctly.</p>
        </Section>

        <Section number="6" title="Marketing Communications">
          <p>We may send you promotional messages, special offers, referral updates, or service reminders by email, SMS, push notification, or other channels.</p>
          <p>You can opt out of marketing messages at any time by following the unsubscribe instructions in the message or contacting us. Even if you opt out of marketing messages, we may still send transactional messages related to your account, bookings, payments, or support requests.</p>
        </Section>

        <Section number="7" title="Data Retention">
          <p>We keep your information for as long as needed to provide our services, operate our business, comply with legal obligations, resolve disputes, prevent fraud, enforce agreements, and maintain business records.</p>
          <p>When information is no longer needed, we may delete, anonymize, or securely retain it as required by law or legitimate business needs.</p>
        </Section>

        <Section number="8" title="Data Security">
          <p>We use reasonable administrative, technical, and physical safeguards to protect your information. However, no system is completely secure, and we cannot guarantee that unauthorized access, hacking, data loss, or misuse will never occur.</p>
          <p>You are responsible for keeping your login credentials secure and for notifying us if you believe your account has been compromised.</p>
        </Section>

        <Section number="9" title="Children's Privacy">
          <p>{APP_NAME} is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected information from a child under 13, we will take reasonable steps to delete it.</p>
        </Section>

        <Section number="10" title="Your Privacy Rights">
          <p>Depending on where you live, you may have rights regarding your personal information, including the right to:</p>
          <BulletList items={[
            "Access the personal information we have about you",
            "Request correction of inaccurate information",
            "Request deletion of your information",
            "Opt out of certain marketing communications",
            "Request a copy of your information",
            "Restrict or object to certain processing",
            "Withdraw consent where processing is based on consent",
          ]} />
          <p>To make a privacy request, contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-[#8c52ff] underline underline-offset-2">{PRIVACY_EMAIL}</a>. We may need to verify your identity before completing your request.</p>
        </Section>

        <Section number="11" title="California Privacy Notice">
          <p>If you are a California resident, you may have additional rights under California privacy laws. In the past 12 months, we may have collected the following categories of personal information:</p>
          <BulletList items={[
            "Identifiers, such as name, phone number, email address, IP address, and account ID",
            "Customer records, such as billing or transaction information",
            "Commercial information, such as bookings, services purchased, and payment history",
            "Internet or app activity, such as pages viewed, clicks, and usage data",
            "Geolocation information, such as service address or approximate location",
            "Audio, electronic, or visual information, such as customer support messages or uploaded vehicle photos",
            "Inferences, such as service preferences or likely booking interests",
          ]} />
          <p>We do not sell personal information. California residents may contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-[#8c52ff] underline underline-offset-2">{PRIVACY_EMAIL}</a> to exercise their rights.</p>
        </Section>

        <Section number="12" title="App Store Privacy Disclosures">
          <p>If you download {APP_NAME} through the Apple App Store, our App Store privacy disclosures are intended to help users understand our privacy practices and are consistent with this Privacy Policy. Apple requires app developers to identify the data they and their third-party partners collect.</p>
        </Section>

        <Section number="13" title="Service Provider Privacy">
          <p>If you use {APP_NAME} as a detailer, contractor, or service provider, we may collect and use your information to:</p>
          <BulletList items={[
            "Verify your identity and eligibility",
            "Assign and manage jobs",
            "Track active service status",
            "Communicate with customers",
            "Process payouts",
            "Monitor service quality",
            "Manage ratings, reviews, and disputes",
            "Improve marketplace performance and safety",
          ]} />
          <p>We may share limited information with customers, such as your first name, arrival status, profile photo, and job-related updates.</p>
        </Section>

        <Section number="14" title="Changes to This Privacy Policy">
          <p>We may update this Privacy Policy from time to time. If we make material changes, we may notify you by updating the date at the top of this policy, sending a notice, or displaying a notice in the app.</p>
          <p>Your continued use of {APP_NAME} after the updated Privacy Policy becomes effective means you accept the revised policy.</p>
        </Section>

        <Section number="15" title="Contact Us">
          <p>If you have questions about this Privacy Policy or how we handle your information, contact us at:</p>
          <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-1">
            <p className="font-semibold text-black">{APP_NAME} / {COMPANY_NAME}</p>
            <p>
              Email:{" "}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-[#8c52ff] underline underline-offset-2">
                {PRIVACY_EMAIL}
              </a>
            </p>
          </div>
        </Section>
      </div>
    </div>
  );
}
