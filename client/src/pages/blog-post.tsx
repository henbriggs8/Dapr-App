import { useRoute, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Clock, Calendar } from "lucide-react";
import { Icon } from "@/components/ui/icon";
import SiteNav from "@/components/site-nav";
import {
  getPostBySlug,
  getRelatedPosts,
  formatPostDate,
  type JournalPost,
  type BlockType,
} from "@/lib/journal-posts";

/* ── SEO head ──────────────────────────────────────────────────────── */
function PostHead({ post }: { post: JournalPost }) {
  return (
    <>
      <title>{post.metaTitle}</title>
      <meta name="description" content={post.metaDescription} />
      <meta property="og:title" content={post.ogTitle} />
      <meta property="og:description" content={post.ogDescription} />
      <meta property="og:image" content={post.image} />
    </>
  );
}

/* ── Body block renderer ───────────────────────────────────────────── */
function Block({ block }: { block: BlockType }) {
  switch (block.kind) {
    case "p":
      return (
        <p className="text-lg lg:text-xl text-gray-700 leading-relaxed">
          {block.text}
        </p>
      );
    case "h2":
      return (
        <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-black mt-2">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="text-xl font-bold text-black mt-1">{block.text}</h3>
      );
    case "pullquote":
      return (
        <blockquote className="border-l-4 border-[#8c52ff] pl-6 my-2">
          <p className="text-xl lg:text-2xl font-bold text-black leading-snug italic">
            "{block.text}"
          </p>
        </blockquote>
      );
    case "ul":
      return (
        <ul className="space-y-3 pl-0">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-lg text-gray-700 leading-relaxed">
              <span className="mt-2 h-2 w-2 rounded-full bg-[#8c52ff] shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

/* ── Related article card ──────────────────────────────────────────── */
function RelatedCard({ post, onClick }: { post: JournalPost; onClick: () => void }) {
  return (
    <article
      className="group cursor-pointer flex flex-col"
      onClick={onClick}
      role="article"
      aria-label={`Read: ${post.title}`}
    >
      <div className="relative rounded-2xl overflow-hidden bg-gray-100 aspect-[4/3] mb-5">
        <img
          src={post.image}
          alt={post.imageAlt}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="absolute top-4 left-4 bg-white/90 text-gray-700 text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
          {post.category}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
        <span>{formatPostDate(post.date)}</span>
        <span>·</span>
        <span className="flex items-center gap-1">
          <Icon icon={Clock} size="xs" />
          {post.readingTime}
        </span>
      </div>
      <h3 className="text-lg font-extrabold text-black leading-snug mb-2 group-hover:text-[#8c52ff] transition-colors">
        {post.title}
      </h3>
      <p className="text-sm text-gray-500 leading-relaxed flex-1">{post.summary}</p>
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-black mt-4 group-hover:text-[#8c52ff] transition-colors">
        Read article <Icon icon={ArrowRight} size="sm" />
      </span>
    </article>
  );
}

/* ── 404 fallback ──────────────────────────────────────────────────── */
function PostNotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <SiteNav />
      <div className="pt-40 pb-32 flex flex-col items-center text-center px-6">
        <p className="text-xs font-bold text-[#8c52ff] uppercase tracking-widest mb-5">
          Dapr Journal
        </p>
        <h1 className="text-4xl font-extrabold text-black mb-4">Article not found</h1>
        <p className="text-gray-500 mb-10">
          This article doesn't exist or may have moved.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-900 transition-colors"
        >
          <Icon icon={ArrowLeft} size="sm" /> Back to Journal
        </button>
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function BlogPostPage() {
  const [, params] = useRoute("/blog/:slug");
  const [, setLocation] = useLocation();
  const slug = params?.slug ?? "";

  const post = getPostBySlug(slug);

  if (!post) {
    return <PostNotFound onBack={() => setLocation("/blog")} />;
  }

  const related = getRelatedPosts(slug, 2);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <PostHead post={post} />
      <SiteNav />

      {/* ── Back link ──────────────────────────────────────────────── */}
      <div className="pt-24 lg:pt-32 pb-0">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <button
            onClick={() => setLocation("/blog")}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-black transition-colors"
          >
            <Icon icon={ArrowLeft} size="sm" /> Dapr Journal
          </button>
        </div>
      </div>

      {/* ── Article header ─────────────────────────────────────────── */}
      <header className="py-10 lg:py-14">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-block bg-[#8c52ff]/10 text-[#8c52ff] text-[11px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
              {post.category}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.06] text-black mb-5">
              {post.title}
            </h1>
            <p className="text-xl lg:text-2xl text-gray-500 leading-relaxed mb-8">
              {post.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-5 text-sm text-gray-400">
              <span className="flex items-center gap-1.5">
                <Icon icon={Calendar} size="xs" />
                {formatPostDate(post.date)}
              </span>
              <span className="flex items-center gap-1.5">
                <Icon icon={Clock} size="xs" />
                {post.readingTime}
              </span>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-gray-600">Dapr</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero image ─────────────────────────────────────────────── */}
      <div className="max-w-[1280px] mx-auto px-6 lg:px-8 mb-16">
        <div className="relative rounded-[2rem] overflow-hidden bg-gray-100 aspect-[16/7] lg:aspect-[21/8]">
          <img
            src={post.image}
            alt={post.imageAlt}
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>
      </div>

      {/* ── Article body ───────────────────────────────────────────── */}
      <article className="max-w-[1280px] mx-auto px-6 lg:px-8 mb-24">
        <div className="max-w-2xl mx-auto lg:mx-0 space-y-8">
          {post.body.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </article>

      {/* ── End CTA ────────────────────────────────────────────────── */}
      <section className="border-t border-gray-100 py-20 lg:py-28">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-black mb-8">
            {post.category === "For Pros"
              ? "Ready to join the Dapr platform?"
              : "There's a better way to care for your car."}
          </h2>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {post.category === "For Pros" ? (
              <>
                <button
                  onClick={() => setLocation("/providers/apply")}
                  className="bg-black text-white px-8 py-4 rounded-full font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                >
                  Become a Dapr Pro <Icon icon={ArrowRight} size="sm" />
                </button>
                <button
                  onClick={() => setLocation("/about")}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold text-base border border-gray-200 hover:border-gray-400 active:scale-[0.98] transition-all"
                >
                  Learn about Dapr
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setLocation("/auth")}
                  className="bg-black text-white px-8 py-4 rounded-full font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all inline-flex items-center gap-2"
                >
                  Book with Dapr <Icon icon={ArrowRight} size="sm" />
                </button>
                <button
                  onClick={() => setLocation("/providers/apply")}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold text-base border border-gray-200 hover:border-gray-400 active:scale-[0.98] transition-all"
                >
                  Become a Dapr Pro
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Related articles ───────────────────────────────────────── */}
      {related.length > 0 && (
        <section className="bg-gray-50 py-20 lg:py-28">
          <div className="max-w-[1280px] mx-auto px-6 lg:px-8">
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-2xl font-extrabold text-black">More from the Journal</h2>
              <button
                onClick={() => setLocation("/blog")}
                className="text-sm font-bold text-gray-500 hover:text-black transition-colors hidden sm:flex items-center gap-1"
              >
                All articles <Icon icon={ArrowRight} size="sm" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {related.map((rp) => (
                <RelatedCard
                  key={rp.slug}
                  post={rp}
                  onClick={() => setLocation(`/blog/${rp.slug}`)}
                />
              ))}
            </div>
            <div className="mt-10 sm:hidden text-center">
              <button
                onClick={() => setLocation("/blog")}
                className="text-sm font-bold text-gray-500 hover:text-black transition-colors"
              >
                View all articles →
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
