import { ArrowLeft } from "lucide-react";
import { Icon } from "@/components/ui/icon";

const EFFECTIVE_DATE = "May 1, 2026";
const COMPANY_NAME = "DAPR Enterprises LLC";
const SUPPORT_EMAIL = "support@autodapr.com";

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

export default function TermsOfService() {
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
          <h1 className="text-base font-semibold text-black">Terms of Service</h1>
          <p className="text-xs text-gray-400">Effective {EFFECTIVE_DATE}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 max-w-2xl mx-auto">
        {/* Intro */}
        <div className="mb-8 space-y-3 text-sm text-gray-600 leading-relaxed">
          <p className="font-medium text-black text-sm">
            {COMPANY_NAME} d/b/a DAPR &nbsp;·&nbsp; Effective Date: {EFFECTIVE_DATE}
          </p>
          <p>
            Welcome to DAPR. These Terms of Service ("Terms") govern your access to and use of the DAPR
            website, mobile application, booking platform, and related services (collectively, the
            "Platform"). By creating an account, booking a service, accepting a job, or otherwise using
            DAPR, you agree to these Terms.
          </p>
          <p>
            Please read them carefully. If you do not agree to these Terms, you may not use the Platform.
          </p>
        </div>

        <Section number="1" title="What DAPR Does">
          <p>
            DAPR is a technology platform that helps customers book mobile car wash, detailing, and
            related vehicle care services with vetted service providers in their area ("Detail Pros").
            DAPR may provide booking, scheduling, payment processing, messaging, location updates,
            service tracking, customer support, and quality-control tools.
          </p>
          <p>
            Unless clearly stated otherwise, DAPR is not itself performing every service booked through
            the Platform. Services may be performed by DAPR employees, contractors, franchisees,
            affiliates, or independent third-party Detail Pros, depending on the market, service type,
            and availability.
          </p>
        </Section>

        <Section number="2" title="Who Can Use DAPR">
          <p>
            You must be at least 18 years old and legally able to enter into a binding agreement to use
            DAPR. By using the Platform, you confirm that all information you provide is accurate,
            current, and complete.
          </p>
          <p>
            You are responsible for maintaining the security of your account login information and for
            all activity that occurs through your account.
          </p>
        </Section>

        <Section number="3" title="Customer Responsibilities">
          <p>When you book a service through DAPR, you agree to:</p>
          <BulletList items={[
            "Provide accurate vehicle, location, contact, and payment information.",
            "Make sure the vehicle is accessible at the scheduled service time.",
            "Park the vehicle in a safe, legal, and serviceable location.",
            "Remove valuables, personal belongings, firearms, medications, sensitive documents, child car seats, and fragile items before service begins.",
            "Disclose any known vehicle issues, including loose trim, peeling paint, prior body work, aftermarket parts, electrical issues, leaks, broken switches, sensitive materials, or pre-existing damage.",
            "Be available by phone or app messaging during the service window if approval is needed for additional work, time, fees, or access.",
          ]} />
          <p>
            DAPR and the Detail Pro may refuse or stop service if the vehicle, location, customer
            conduct, weather, safety conditions, or other circumstances make the job unsafe,
            impractical, illegal, or outside the booked service scope.
          </p>
        </Section>

        <Section number="4" title="Detail Pro Responsibilities">
          <p>If you use DAPR as a Detail Pro, you agree to:</p>
          <BulletList items={[
            "Provide accurate identity, background, experience, insurance, tax, payment, and eligibility information when requested.",
            "Perform accepted jobs professionally, safely, and in accordance with DAPR's service standards.",
            "Use appropriate equipment, chemicals, tools, and methods for the vehicle and service type.",
            "Communicate respectfully with customers and DAPR support.",
            "Avoid off-platform payments, off-platform booking, customer poaching, fraud, harassment, discrimination, unsafe driving, and misleading service claims.",
            "Report incidents, damage claims, customer disputes, safety concerns, or job issues promptly.",
          ]} />
          <p>
            DAPR may remove, suspend, or restrict any Detail Pro who violates these Terms, receives
            repeated customer complaints, fails quality standards, creates safety concerns, or acts in a
            way that harms customers, vehicles, DAPR, or the DAPR brand.
          </p>
        </Section>

        <Section number="5" title="Service Scope and Results">
          <p>
            Service descriptions, prices, time estimates, arrival windows, photos, and examples on the
            Platform are provided for general guidance. Actual results may vary based on the condition,
            age, size, material, paint quality, prior damage, contamination level, stains, odor, pet
            hair, weather, and accessibility of the vehicle.
          </p>
          <p>
            Some issues may not be fully removable or correctable, including but not limited to deep
            stains, permanent odors, etched water spots, oxidation, clear coat failure, paint chips,
            scratches, dye transfer, mold, mildew, excessive pet hair, biological contamination,
            adhesive residue, or damage caused by prior cleaning attempts.
          </p>
          <p>
            If a vehicle requires additional labor, specialized service, biohazard handling, pet hair
            removal, heavy stain treatment, oversized-vehicle work, adhesive removal, paint correction,
            or other add-ons, DAPR or the Detail Pro may request your approval for additional charges
            before continuing.
          </p>
        </Section>

        <Section number="6" title="Pricing, Payment, and Authorization">
          <p>
            By booking a service, you authorize DAPR and its payment processor to charge your selected
            payment method for the service price, taxes, fees, deposits, cancellation fees, no-show
            fees, approved add-ons, tips, subscriptions, memberships, and any other charges disclosed
            to you at checkout or approved by you in the Platform.
          </p>
          <p>
            DAPR may place a temporary authorization hold or require a deposit when you book. Final
            charges may vary if you approve additional services, if vehicle information was inaccurate,
            or if the job requires extra time or materials.
          </p>
          <p>
            All payments must be made through the Platform unless DAPR gives written permission
            otherwise. Paying or accepting payment outside the Platform may result in account suspension
            or removal.
          </p>
        </Section>

        <Section number="7" title="Cancellations, Rescheduling, and No-Shows">
          <p>
            You may cancel or reschedule a booking through the Platform, subject to the cancellation
            policy shown at checkout or in the app. Unless a different policy is shown at checkout, the
            following default policy applies:
          </p>
          <BulletList items={[
            "Cancellations made more than 24 hours before the scheduled service time may be eligible for a full refund.",
            "Cancellations made within 24 hours of the scheduled service time may be subject to a cancellation fee.",
            "If the Detail Pro is already on the way, has arrived, or cannot access the vehicle due to inaccurate information, locked access, unsafe conditions, or customer unavailability, the booking may be treated as a no-show and may be non-refundable.",
            "Weather, emergencies, safety concerns, equipment issues, or other circumstances may require DAPR or the Detail Pro to reschedule the service.",
          ]} />
          <p>
            DAPR may update cancellation rules by market, service type, membership plan, promotion, or
            availability.
          </p>
        </Section>

        <Section number="8" title="Subscriptions and Memberships">
          <p>
            DAPR may offer recurring memberships, maintenance plans, subscriptions, or service credits.
            If you enroll in a recurring plan, you authorize DAPR to charge your payment method on a
            recurring basis according to the plan terms shown at signup.
          </p>
          <p>
            You may cancel a recurring plan through your account settings, by contacting support, or
            through any cancellation method made available in the Platform. Cancellation takes effect at
            the end of the current billing period unless otherwise stated. DAPR does not guarantee
            refunds for partial billing periods unless required by law or expressly stated in the plan
            terms.
          </p>
          <p>
            DAPR may change subscription pricing, benefits, included services, or renewal terms with
            notice where required. Continued use after the effective date of a change means you accept
            the updated terms.
          </p>
        </Section>

        <Section number="9" title="Refunds and Service Concerns">
          <p>
            If you are not satisfied with a service, contact DAPR support as soon as possible. DAPR
            may, at its discretion, offer a re-clean, credit, partial refund, full refund, or other
            resolution depending on the situation.
          </p>
          <p>
            Refunds are not guaranteed and may be denied where the issue results from pre-existing
            conditions, inaccurate vehicle information, inaccessible areas, unrealistic expectations,
            refusal to approve recommended add-ons, or circumstances outside DAPR's reasonable control.
          </p>
        </Section>

        <Section number="10" title="Vehicle Damage Claims">
          <p>
            DAPR takes vehicle care seriously. If you believe your vehicle was damaged during a service,
            you must report the claim to DAPR within 24 hours of service completion, or as soon as
            reasonably possible, and provide:
          </p>
          <BulletList items={[
            "Photos or videos of the alleged damage.",
            "A description of what happened.",
            "The vehicle make, model, year, and service date.",
            "Any relevant repair estimates, inspection reports, or supporting documentation.",
          ]} />
          <p>
            DAPR may investigate the claim, request additional information, inspect the vehicle, speak
            with the Detail Pro, review photos, compare before-and-after documentation, or refer the
            matter to an insurance provider.
          </p>
          <p>
            DAPR is not responsible for pre-existing damage, normal wear and tear, manufacturer defects,
            fragile or deteriorated materials, loose trim, failing clear coat, prior body work,
            aftermarket modifications, electrical failures, leaks, broken switches, personal items left
            in the vehicle, or damage that was not caused by the service.
          </p>
        </Section>

        <Section number="11" title="Personal Items and Vehicle Contents">
          <p>
            You are responsible for removing personal belongings before service begins. DAPR and Detail
            Pros are not responsible for lost, misplaced, damaged, or discarded items left in the
            vehicle, including cash, electronics, jewelry, documents, medications, firearms, child car
            seats, garage openers, keys, or personal property.
          </p>
          <p>
            Detail Pros may move items inside the vehicle as needed to perform the service, but they are
            not responsible for organizing, inventorying, securing, or storing personal belongings.
          </p>
        </Section>

        <Section number="12" title="Photos, Reviews, and User Content">
          <p>
            You may submit reviews, photos, messages, support requests, vehicle notes, and other content
            through the Platform ("User Content"). You are responsible for your User Content and agree
            not to submit anything false, misleading, unlawful, abusive, defamatory, discriminatory,
            obscene, infringing, or harmful.
          </p>
          <p>
            You grant DAPR a non-exclusive, worldwide, royalty-free license to use, store, display,
            reproduce, and share User Content as reasonably necessary to operate the Platform, provide
            services, resolve disputes, improve quality, prevent fraud, and support customers or Detail
            Pros.
          </p>
          <p>
            DAPR may use service photos for internal quality control, support, training, before-and-after
            documentation, and claim investigation. DAPR will not intentionally disclose sensitive
            personal information from your vehicle photos for marketing purposes without appropriate
            permission.
          </p>
        </Section>

        <Section number="13" title="Location, Messaging, and Notifications">
          <p>
            The Platform may use location information, push notifications, SMS, email, phone calls, and
            in-app messages to provide booking updates, arrival estimates, payment confirmations,
            support, promotions, and service communications.
          </p>
          <p>
            By using DAPR, you consent to receive transactional communications related to your account
            and bookings. You may opt out of promotional messages where required by law, but you may
            still receive important service-related messages.
          </p>
        </Section>

        <Section number="14" title="Prohibited Conduct">
          <p>You agree not to:</p>
          <BulletList items={[
            "Use DAPR for unlawful, fraudulent, abusive, or unsafe purposes.",
            "Harass, threaten, discriminate against, or harm customers, Detail Pros, DAPR employees, or third parties.",
            "Attempt to avoid DAPR fees by booking or paying off-platform.",
            "Submit false claims, fake reviews, misleading vehicle information, or fraudulent payment details.",
            "Interfere with Platform security, reverse engineer the app, scrape data, copy DAPR content, or misuse DAPR's systems.",
            "Use DAPR's name, logos, photos, customer information, pricing, or brand assets without permission.",
            "Bring dangerous, illegal, biohazardous, or unsafe materials into a service environment.",
          ]} />
          <p>
            DAPR may suspend or terminate accounts that violate these Terms or create risk for DAPR,
            customers, Detail Pros, vehicles, payment processors, or third parties.
          </p>
        </Section>

        <Section number="15" title="Promotions and Credits">
          <p>
            DAPR may offer discounts, referral credits, promo codes, gift cards, or other promotions.
            Promotions may be subject to additional terms, expiration dates, service limitations,
            location restrictions, and availability. Promotions have no cash value unless required by
            law and may not be transferred, resold, duplicated, or abused.
          </p>
          <p>
            DAPR may modify, suspend, or revoke promotions if it believes they were used fraudulently,
            mistakenly, or in violation of these Terms.
          </p>
        </Section>

        <Section number="16" title="Third-Party Services">
          <p>
            DAPR may rely on third-party providers for payments, maps, messaging, identity verification,
            analytics, customer support, hosting, insurance, background checks, and other services. Your
            use of those features may be subject to additional third-party terms and privacy policies.
          </p>
          <p>
            DAPR is not responsible for third-party outages, errors, processing delays, payment
            declines, map inaccuracies, app store issues, or third-party service interruptions.
          </p>
        </Section>

        <Section number="17" title="Intellectual Property">
          <p>
            The Platform, including DAPR's name, logos, designs, software, text, graphics, photos,
            icons, service flows, and brand assets, is owned by DAPR or its licensors and is protected
            by intellectual property laws.
          </p>
          <p>
            You may use the Platform only for its intended purpose. You may not copy, modify,
            distribute, sell, lease, reverse engineer, or create derivative works from the Platform or
            DAPR's content without written permission.
          </p>
        </Section>

        <Section number="18" title="App Store Terms">
          <p>
            If you download DAPR through the Apple App Store, Google Play, or another app marketplace,
            your use of the app may also be subject to the applicable app store's terms, rules, and
            policies. Those app stores are not responsible for providing DAPR services, support,
            refunds, maintenance, or handling service claims unless required by their own policies or
            applicable law.
          </p>
        </Section>

        <Section number="19" title="Disclaimers">
          <p>
            DAPR provides the Platform and related services on an "as is" and "as available" basis. To
            the fullest extent permitted by law, DAPR disclaims all warranties, express or implied,
            including warranties of merchantability, fitness for a particular purpose,
            non-infringement, availability, accuracy, and uninterrupted operation.
          </p>
          <p>
            DAPR does not guarantee that the Platform will always be available, error-free, secure, or
            that every service will meet every expectation. Vehicle care results depend on many factors
            outside DAPR's control.
          </p>
        </Section>

        <Section number="20" title="Limitation of Liability">
          <p>
            To the fullest extent permitted by law, DAPR and its owners, officers, employees,
            contractors, affiliates, partners, licensors, and service providers will not be liable for
            indirect, incidental, special, consequential, exemplary, or punitive damages, including
            lost profits, lost data, lost business, vehicle downtime, loss of use, emotional distress,
            or reputational harm.
          </p>
          <p>
            To the fullest extent permitted by law, DAPR's total liability for any claim arising out of
            or relating to the Platform or a service will not exceed the amount you paid to DAPR for
            the specific service giving rise to the claim, or $100, whichever is greater, unless a
            higher amount is required by applicable law.
          </p>
          <p>
            Some jurisdictions do not allow certain limitations of liability, so some of the above
            limitations may not apply to you.
          </p>
        </Section>

        <Section number="21" title="Indemnification">
          <p>
            You agree to defend, indemnify, and hold harmless DAPR and its owners, officers, employees,
            contractors, affiliates, partners, licensors, and service providers from and against any
            claims, damages, losses, liabilities, costs, and expenses, including reasonable attorneys'
            fees, arising from or related to:
          </p>
          <BulletList items={[
            "Your use or misuse of the Platform.",
            "Your violation of these Terms.",
            "Your violation of any law or third-party right.",
            "Your User Content.",
            "Your vehicle, property, conduct, or failure to disclose relevant information.",
            "Your off-platform arrangement with a customer or Detail Pro.",
          ]} />
        </Section>

        <Section number="22" title="Dispute Resolution">
          <p>
            Please contact DAPR support first if you have a concern. Most issues can be resolved quickly
            through customer support.
          </p>
          <p>
            To the fullest extent permitted by law, any dispute, claim, or controversy arising out of
            or relating to these Terms, the Platform, or a DAPR service will be resolved through
            binding individual arbitration rather than in court, except that either party may bring a
            qualifying claim in small claims court.
          </p>
          <p>
            You and DAPR agree to resolve disputes only on an individual basis and not as part of a
            class, collective, consolidated, or representative action, to the extent permitted by law.
          </p>
          <p>
            This section does not prevent either party from seeking temporary or emergency injunctive
            relief where necessary to protect intellectual property, confidential information, safety,
            or platform integrity.
          </p>
        </Section>

        <Section number="23" title="Governing Law">
          <p>
            These Terms are governed by the laws of the State of Delaware, without regard to
            conflict-of-law rules, unless another law is required to apply.
          </p>
        </Section>

        <Section number="24" title="Changes to These Terms">
          <p>
            DAPR may update these Terms from time to time. When we make material changes, we may notify
            you through the Platform, by email, or by updating the effective date above.
          </p>
          <p>
            Your continued use of DAPR after updated Terms become effective means you accept the updated
            Terms. If you do not agree, you must stop using the Platform.
          </p>
        </Section>

        <Section number="25" title="Termination">
          <p>
            DAPR may suspend or terminate your account or access to the Platform at any time if you
            violate these Terms, create risk, misuse the Platform, fail payment, submit false
            information, engage in fraud, or act in a way that harms DAPR, customers, Detail Pros, or
            third parties.
          </p>
          <p>
            You may stop using DAPR at any time. Certain sections of these Terms will continue to apply
            after termination, including payment obligations, intellectual property rights, disclaimers,
            limitation of liability, indemnification, dispute resolution, and any other terms that by
            their nature should survive.
          </p>
        </Section>

        <Section number="26" title="Contact Us">
          <p>If you have questions about these Terms, contact us at:</p>
          <div className="bg-gray-50 rounded-xl p-4 space-y-1 text-sm">
            <p className="font-medium text-black">DAPR Support</p>
            <p>{COMPANY_NAME} d/b/a DAPR</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-[#8c52ff] underline underline-offset-2"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </Section>

        {/* Consent language */}
        <div className="border-t border-gray-100 pt-8 mt-4 space-y-5">
          <h3 className="text-sm font-semibold text-black">Booking Consent</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            By booking, I agree to DAPR's Terms of Service and Privacy Policy. I authorize DAPR to
            charge my payment method for the selected service, taxes, fees, approved add-ons, and any
            applicable cancellation or no-show fees.
          </p>

          <h3 className="text-sm font-semibold text-black">Account Signup Consent</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            By creating an account, I agree to DAPR's Terms of Service and Privacy Policy, and I
            consent to receive service-related messages about my bookings and account.
          </p>
        </div>

        <p className="text-xs text-gray-400 text-center mt-10 mb-6">
          © {new Date().getFullYear()} {COMPANY_NAME} d/b/a DAPR. All rights reserved.
        </p>
      </div>
    </div>
  );
}
