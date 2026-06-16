import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import PublicHeader, { Footer } from "../components/Layout/Header";
import { newsTopics } from "../data/newsTopics";
import Card from "../components/ui/Card";

function SmartImage({ src, fallback, alt, className }) {
  const [current, setCurrent] = useState(src);
  return (
    <img
      src={current}
      alt={alt}
      className={className}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}

export default function NewsPage() {
  return (
    <>
      <PublicHeader />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Civic News & Topics</h1>
        <p className="mt-2 text-slate-600">Stories around cleanliness and civic betterment.</p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {newsTopics.map((t) => (
            <Link key={t.id} to={`/news/${t.id}`}>
              <Card className="overflow-hidden p-0 transition hover:shadow-md">
                <SmartImage src={t.image} fallback={t.imageFallback} alt={t.title} className="h-44 w-full object-cover" />
                <div className="p-4">
                  <h2 className="text-lg font-bold">{t.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </>
  );
}

export function NewsDetailContent({ topic, backUrl }) {
  const articles = [
    `${topic.title}: Local communities organize weekly drives to improve surroundings.`,
    `Citizens with similar interests in ${topic.title.toLowerCase()} connect on Civic Review Portal.`,
    `Municipal engagement rises when residents track issues and share feedback online.`,
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link to={backUrl} className="text-sm font-medium text-civic-600 hover:text-civic-800">← Back to News</Link>
      <SmartImage src={topic.image} fallback={topic.imageFallback} alt={topic.title} className="mt-4 h-64 w-full rounded-2xl object-cover" />
      <h1 className="mt-6 text-3xl font-bold">{topic.title}</h1>
      <p className="mt-3 text-lg text-slate-600">{topic.description}</p>
      <div className="mt-8 space-y-4">
        {articles.map((a, i) => (
          <Card key={i}><p className="text-slate-700">{a}</p></Card>
        ))}
      </div>
    </div>
  );
}

export function NewsDetailPage() {
  const { topicId } = useParams();
  const topic = newsTopics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <>
        <PublicHeader />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Topic not found</h1>
          <Link to="/news" className="mt-4 inline-block text-civic-600">← Back to News</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <NewsDetailContent topic={topic} backUrl="/news" />
      <Footer />
    </>
  );
}

export function AppNewsDetailPage() {
  const { topicId } = useParams();
  const topic = newsTopics.find((t) => t.id === topicId);

  if (!topic) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Topic not found</h1>
        <Link to="/app/news" className="mt-4 inline-block text-civic-600">← Back to News</Link>
      </div>
    );
  }

  return <NewsDetailContent topic={topic} backUrl="/app/news" />;
}

export function AppNewsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold">News</h1>
      <p className="mt-1 text-slate-600">Civic topics and community updates.</p>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {newsTopics.map((t) => (
          <Link key={t.id} to={`/app/news/${t.id}`}>
            <Card className="overflow-hidden p-0 hover:shadow-md">
              <SmartImage src={t.image} fallback={t.imageFallback} alt={t.title} className="h-36 w-full object-cover" />
              <div className="p-4">
                <h2 className="font-bold">{t.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{t.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
