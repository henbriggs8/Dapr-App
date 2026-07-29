import { useLocation } from "wouter";
import { ArrowRight, Clock } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import SiteNav from "@/components/site-nav";
import {
  JOURNAL_POSTS,
  formatPostDate,
  type JournalPost,
} from "@/lib/journal-posts";

/* ── SEO head helper ───────────────────────────────────────────────── */
function JournalHead() {
  return (
    <>
      <title>Dapr Journal — Notes on building a better way to care for your car</title>
      <meta
        name="description"
        content="Notes on building a better way to care for your car. Updates on Dapr's mission, the people behind it, and what we're learning."
      />
      <meta property="og:title" content="Dapr Journal" />
      <meta
        property="og:description"
        content="Notes on building a better way to care for your car."
      />
    </>
  );
}

/* ── Featured article card ─────────────────────────────────────────── */
function FeaturedCard({ post, onClick }: { post: JournalPost; onClick: () => void }) {
  return (
    <article
      className="group cursor-pointer"
      onClick={onClick}
      role="article"
      aria-label={`Read: ${post.title}`}
    >
      {/* Image */}
      <div className="relative rounded-[1.5rem] overflow-hidden bg-gray-100 aspect-[16/8] lg:aspect-[21/9] mb-8">
        <img
          src={post.image}
          alt={post.imageAlt}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Category chip */}
        <span className="absolute top-5 left-5 bg-[#8c52ff] text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
          {post.category}
        </span>
      </div>

      {/* Text */}
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 text-sm text-gray-400 mb-4">
          <span>{formatPostDate(post.date)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Icon icon={Clock} size="xs" />
            {post.readingTime}
          </span>
        </div>
        <h2 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-black leading-tight mb-4 group-hover:text-[#8c52ff] transition-colors">
          {post.title}
        </h2>
        <p className="text-lg text-gray-500 leading-relaxed mb-6">{post.summary}</p>
        <span className="inline-flex items-center gap-2 text-sm font-bold text-black group-hover:text-[#8c52ff] transition-colors">
          Read article <Icon icon={ArrowRight} size="sm" />
        </span>
      </div>
    </article>
  );
}

/* ── Grid article card ─────────────────────────────────────────────── */
function GridCard({ post, onClick }: { post: JournalPost; onClick: () => void }) {
  return (
    <article
      className="group cursor-pointer flex flex-col"
      onClick={onClick}
      role="article"
      aria-label={`Read: ${post.title}`}
    >
      {/* Image */}
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] mb-5">
        <img
          src={post.image}
          alt={post.imageAlt}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <span className="absolute top-4 left-4 bg-white/90 text-gray-700 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
          {post.category}
        </span>
      </div>

      {/* Text */}
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
        <span>{formatPostDate(post.date)}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Icon icon={Clock} size="xs" />
          {post.readingTime}
        </span>
      </div>
      <h3 className="text-xl font-extrabold tracking-tight text-black leading-snug mb-2 group-hover:text-[#8c52ff] transition-colors">
        {post.title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1">{post.summary}</p>
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black mt-4 group-hover:text-[#8c52ff] transition-colors">
        Read article <Icon icon={ArrowRight} size="sm" />
      </span>
    </article>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function BlogPage() {
  const [, setLocation] = useLocation();

  const featured = JOURNAL_POSTS[0];
  const rest = JOURNAL_POSTS.slice(1);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <JournalHead />
      <SiteNav />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <section className="pt-28 pb-12 lg:pt-40 lg:pb-16 border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <span className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5 block">
            Dapr Journal
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-black leading-[1.06] mb-4">
            Notes on building a better way
            <br className="hidden sm:block" /> to care for your car.
          </h1>
        </div>
      </section>

      {/* ── Featured article ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <FeaturedCard
            post={featured}
            onClick={() => setLocation(`/blog/${featured.slug}`)}
          />
        </div>
      </section>

      {/* ── Article grid ─────────────────────────────────────────────── */}
      {rest.length > 0 && (
        <section className="pb-20 lg:pb-28 border-t border-gray-100">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8 pt-16 lg:pt-24">
            <div
              className={`grid gap-10 lg:gap-12 ${
                rest.length === 1
                  ? "grid-cols-1 max-w-xl"
                  : "grid-cols-1 sm:grid-cols-2"
              }`}
            >
              {rest.map((post) => (
                <GridCard
                  key={post.slug}
                  post={post}
                  onClick={() => setLocation(`/blog/${post.slug}`)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32 bg-black text-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5">
            Dapr
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight mb-5">
            Follow along as we build
            <br className="hidden sm:block" /> the future of car care.
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto">
            Early customers and Pros in Gilbert are shaping what Dapr becomes.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => setLocation("/auth")}
              className="bg-white text-black px-8 py-4 rounded-full font-bold text-base hover:bg-gray-100 active:scale-[0.98] transition-all inline-flex items-center gap-2"
            >
              Book with Dapr <Icon icon={ArrowRight} size="sm" />
            </button>
            <button
              onClick={() => setLocation("/providers/apply")}
              className="bg-transparent text-white px-8 py-4 rounded-full font-bold text-base border border-white/30 hover:border-white/70 active:scale-[0.98] transition-all"
            >
              Become a Dapr Pro
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
