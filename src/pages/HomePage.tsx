import HeroBanner from "@/components/store/home/HeroBanner";
import CategoryStrip from "@/components/store/home/CategoryStrip";
import FeaturedGrid from "@/components/store/home/FeaturedGrid";
import PillarsBar from "@/components/store/home/PillarsBar";
import EditorialBlock from "@/components/store/home/EditorialBlock";
import NewsletterBlock from "@/components/store/home/NewsletterBlock";
import { useSiteContent } from "@/hooks/useSiteContent";

const HomePage = () => {
  const { get } = useSiteContent();
  const main = get("featured_main");
  const news = get("featured_news");

  return (
    <>
      <HeroBanner />
      <PillarsBar />
      <CategoryStrip />
      <FeaturedGrid
        eyebrow={main.eyebrow}
        title={main.title}
        subtitle={main.subtitle}
        featuredOnly
        limit={8}
      />
      <EditorialBlock />
      <FeaturedGrid
        eyebrow={news.eyebrow}
        title={news.title}
        subtitle={news.subtitle}
        featuredOnly={false}
        limit={4}
        showSeeAll={false}
      />
      <NewsletterBlock />
    </>
  );
};

export default HomePage;
