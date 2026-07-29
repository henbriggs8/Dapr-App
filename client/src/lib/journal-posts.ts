/**
 * Dapr Journal — static article content.
 * Replace this data structure with a CMS fetch when ready.
 * Each article is self-contained: metadata + an array of content blocks.
 */

export type BlockType =
  | { kind: "p"; text: string }
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "pullquote"; text: string }
  | { kind: "ul"; items: string[] };

export interface JournalPost {
  slug: string;
  category: string;
  title: string;
  subtitle: string;
  date: string;          // ISO-8601 date
  readingTime: string;   // e.g. "4 min read"
  image: string;         // path relative to /public
  imageAlt: string;
  summary: string;       // used on listing cards
  /** SEO */
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  /** Full article body */
  body: BlockType[];
}

export const JOURNAL_POSTS: JournalPost[] = [
  /* ─────────────────────────────────────────────────────────────────────
   * Article 1 — Featured
   * ────────────────────────────────────────────────────────────────────*/
  {
    slug: "car-care-should-come-to-you",
    category: "Company",
    title: "Car care should come to you",
    subtitle:
      "Why we're building Dapr and why the way people care for their cars needs to change.",
    date: "2026-07-10",
    readingTime: "4 min read",
    image: "/dapper-van-house.jpg",
    imageAlt: "A Dapr service van arriving at a customer's home",
    summary:
      "Consumers can order food, rides, and groceries on demand. Car care is the exception. Here's why we're fixing it.",
    metaTitle: "Car care should come to you — Dapr Journal",
    metaDescription:
      "Dapr is building on-demand car care that comes directly to you. Here's why the old way of caring for your car needs to change.",
    ogTitle: "Car care should come to you",
    ogDescription:
      "Consumers can order food, rides, and groceries on demand. Car care is the exception. Dapr is fixing that.",
    body: [
      {
        kind: "p",
        text: "Consumers can order food, rides, and groceries on demand, but car care is still offline and messy. Dapr fixes that.",
      },
      {
        kind: "p",
        text: "Think about how you take care of your car today. You call around to find someone available. You try to compare prices that are never clearly listed. You rearrange your schedule, drive somewhere, wait around, and hope the provider you chose does good work. It's a lot of effort for something that should be simple.",
      },
      {
        kind: "h2",
        text: "Why car care is still stuck",
      },
      {
        kind: "p",
        text: "Most industries that involve service providers coming to your home have been transformed by software. Rideshare, food delivery, home cleaning, grocery delivery — they all moved onto your phone. Car care largely hasn't.",
      },
      {
        kind: "p",
        text: "The challenges are real. You need to trust someone with one of your most expensive possessions. Local detailers and car care professionals don't always have the tools to present themselves clearly online. Pricing varies wildly. And there's no simple, consistent experience that a customer can count on.",
      },
      {
        kind: "pullquote",
        text: "It should be as easy to take care of your car as it is to order dinner.",
      },
      {
        kind: "h2",
        text: "What Dapr is building",
      },
      {
        kind: "p",
        text: "Dapr is a platform where customers choose their vehicle, pick a service, see a clear price, and select a time — all from their phone. A vetted local Dapr Pro comes directly to wherever the car is parked.",
      },
      {
        kind: "p",
        text: "We're starting with detailing because it's the most frequent, most approachable form of car care — and because doing it well requires the kind of professionalism and consistency we want to build the platform around. But the larger goal is better infrastructure for on-demand car care broadly.",
      },
      {
        kind: "h2",
        text: "Still early, focused on getting it right",
      },
      {
        kind: "p",
        text: "We're not trying to be everywhere before we're good anywhere. Dapr is focused on delivering an exceptional experience in our first market before expanding. We'd rather do a small number of bookings really well than rush the experience to chase growth.",
      },
      {
        kind: "p",
        text: "That means working closely with the Dapr Pros on the platform, understanding what they need to do their best work, and learning directly from the customers they serve.",
      },
      {
        kind: "p",
        text: "There's a better way to care for your car.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
   * Article 2
   * ────────────────────────────────────────────────────────────────────*/
  {
    slug: "why-dapr-is-starting-in-gilbert",
    category: "Company",
    title: "Why Dapr is starting in Gilbert, Arizona",
    subtitle: "Building an exceptional local marketplace one neighborhood at a time.",
    date: "2026-07-17",
    readingTime: "3 min read",
    image: "/dapper-jeep-desert.jpg",
    imageAlt: "A vehicle in the Arizona desert",
    summary:
      "Local service marketplaces depend on density, trust, and consistently great experiences. Here's why we're starting in one place and building from there.",
    metaTitle: "Why Dapr is starting in Gilbert, Arizona — Dapr Journal",
    metaDescription:
      "Dapr is building its local marketplace in Gilbert, AZ first — focusing on density, trust, and consistent quality before expanding.",
    ogTitle: "Why Dapr is starting in Gilbert, Arizona",
    ogDescription:
      "Strong local marketplaces are built one neighborhood at a time. Here's how Dapr is approaching that in Gilbert.",
    body: [
      {
        kind: "p",
        text: "Dapr is launching in Gilbert, Arizona. Not everywhere — just here, for now.",
      },
      {
        kind: "p",
        text: "That's a deliberate choice. Local service marketplaces aren't built by announcing that you're available in every city. They're built by becoming genuinely great in one place first.",
      },
      {
        kind: "h2",
        text: "What it takes to build a local marketplace",
      },
      {
        kind: "p",
        text: "A marketplace connecting customers with local service professionals only works when a few things are true at the same time. You need enough providers in a given area to offer reasonable availability. You need customers who trust the platform to send someone to their driveway. And you need every experience to be good enough that people use Dapr again.",
      },
      {
        kind: "p",
        text: "That kind of density and trust takes time to build. Pretending to have it everywhere before you've earned it anywhere is one of the fastest ways to produce a bad product.",
      },
      {
        kind: "pullquote",
        text: "We're starting the way strong local marketplaces are built: one neighborhood, one customer, and one great experience at a time.",
      },
      {
        kind: "h2",
        text: "Why Gilbert",
      },
      {
        kind: "p",
        text: "Gilbert is one of the fastest-growing communities in the country. It has a high density of vehicles, active homeowners who care about their property, and a strong local professional community. It's the kind of place where an on-demand car care platform has a real reason to exist.",
      },
      {
        kind: "p",
        text: "It's also where our team is based. That proximity matters. We can respond quickly, learn from real customer feedback, and work directly with local Dapr Pros to improve the platform.",
      },
      {
        kind: "h2",
        text: "How we'll grow from here",
      },
      {
        kind: "p",
        text: "Dapr isn't planning to expand city by city on a schedule. We'll move to the next market when we've proven the model here — when the customer experience is consistently excellent and when we understand what Dapr Pros need to succeed.",
      },
      {
        kind: "p",
        text: "The early customers and Pros in Gilbert will help shape what Dapr becomes. Their feedback will improve the product for everyone who comes after them.",
      },
      {
        kind: "p",
        text: "Starting local isn't a limitation. It's the point.",
      },
    ],
  },

  /* ─────────────────────────────────────────────────────────────────────
   * Article 3
   * ────────────────────────────────────────────────────────────────────*/
  {
    slug: "what-it-means-to-be-a-dapr-pro",
    category: "For Pros",
    title: "What it means to be a Dapr Pro",
    subtitle: "The standard we're building for professionals on the Dapr platform.",
    date: "2026-07-24",
    readingTime: "4 min read",
    image: "/dapper-lambo.jpg",
    imageAlt: "A Dapr Pro caring for a vehicle",
    summary:
      "Becoming a Dapr Pro should represent a standard of service, not simply creating an account. Here's what we're building for the professionals on our platform.",
    metaTitle: "What it means to be a Dapr Pro — Dapr Journal",
    metaDescription:
      "Dapr Pros are independent car-care professionals held to a real standard of service. Here's what that means and how Dapr supports them.",
    ogTitle: "What it means to be a Dapr Pro",
    ogDescription:
      "Great car care depends on great people. Dapr is being built to help those people do their best work.",
    body: [
      {
        kind: "p",
        text: "Great car care depends on great people. Dapr is being built to help those people do their best work.",
      },
      {
        kind: "p",
        text: "Dapr Pros are independent car-care professionals who serve customers through the Dapr platform. They manage their own schedule, handle their own equipment, and run their own business — Dapr provides the tools, the demand, and the structure that makes that easier.",
      },
      {
        kind: "h2",
        text: "What customers should expect from a Dapr Pro",
      },
      {
        kind: "p",
        text: "When a customer books through Dapr, they're inviting a professional to their home, their driveway, or their workplace. That requires a level of trust that has to be earned.",
      },
      {
        kind: "ul",
        items: [
          "Professionalism — showing up on time, communicating clearly, representing the Dapr platform well.",
          "Care — treating every vehicle and every property with the same respect you'd want shown to your own.",
          "Reliability — following through on bookings and maintaining consistent quality.",
          "Communication — keeping customers informed, especially when anything changes.",
        ],
      },
      {
        kind: "p",
        text: "These aren't aspirational values on a wall. They're the minimum baseline for being a Dapr Pro.",
      },
      {
        kind: "h2",
        text: "What Dapr is building for Pros",
      },
      {
        kind: "p",
        text: "Independent service professionals spend a significant amount of their time on things that aren't their actual work: finding customers, managing their schedule, chasing payments, handling back-and-forth communication. That's time and energy that should go toward doing excellent work.",
      },
      {
        kind: "pullquote",
        text: "Dapr is designed to help Pros spend less time on overhead and more time on the work they're good at.",
      },
      {
        kind: "p",
        text: "The platform handles customer acquisition, scheduling, payments, and job management. As Dapr grows, we want to give skilled professionals better technology, more consistent demand, and the kind of infrastructure that lets them build a real business.",
      },
      {
        kind: "h2",
        text: "A standard, not just an account",
      },
      {
        kind: "p",
        text: "Becoming a Dapr Pro involves an application and a vetting process. We're not trying to be the platform that anyone can list on without accountability. The goal is to build something that customers trust, which means the people on the platform have to meet a real standard.",
      },
      {
        kind: "p",
        text: "We're still early in building this. The process will continue to improve. But the principle — that being a Dapr Pro means something — is fundamental to the platform we're building.",
      },
    ],
  },
];

/** Quick lookup by slug */
export function getPostBySlug(slug: string): JournalPost | undefined {
  return JOURNAL_POSTS.find((p) => p.slug === slug);
}

/** Other posts, excluding the one with this slug */
export function getRelatedPosts(slug: string, count = 2): JournalPost[] {
  return JOURNAL_POSTS.filter((p) => p.slug !== slug).slice(0, count);
}

/** Format ISO date → "July 10, 2026" */
export function formatPostDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
