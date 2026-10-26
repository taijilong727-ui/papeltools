import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/lib/i18n/config';
import {
  softwareApplicationJsonLd,
  faqPageJsonLd,
  webSiteJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  type FAQItem,
} from '@/lib/seo';
import { HeroSection } from '@/components/sections/HeroSection';
import { PillarsSection } from '@/components/sections/PillarsSection';
import { CompareSection } from '@/components/sections/CompareSection';
import { ScenariosSection } from '@/components/sections/ScenariosSection';
import { FAQSection } from '@/components/sections/FAQSection';
import { MCPSection } from '@/components/sections/MCPSection';

interface HomePageContentProps {
  locale: Locale;
}

/**
 * 首页共享内容
 *
 * 根路径直接渲染英文首页，/[locale] 分支继续渲染 es/pt。
 * 两个路由必须复用同一份区块和 JSON-LD，避免根首页与语言首页内容分叉。
 */
export async function HomePageContent({ locale }: HomePageContentProps) {
  setRequestLocale(locale);

  const tFaq = await getTranslations({ locale, namespace: 'faq' });
  const faqItems: FAQItem[] = [
    { question: tFaq('q1'), answer: tFaq('a1') },
    { question: tFaq('q2'), answer: tFaq('a2') },
    { question: tFaq('q3'), answer: tFaq('a3') },
    { question: tFaq('q4'), answer: tFaq('a4') },
    { question: tFaq('q5'), answer: tFaq('a5') },
    { question: tFaq('q6'), answer: tFaq('a6') },
  ];

  const appLd = JSON.stringify(softwareApplicationJsonLd(locale));
  const siteLd = JSON.stringify(webSiteJsonLd(locale));
  const faqLd = JSON.stringify(faqPageJsonLd(faqItems));
  const homeLabel = locale === 'es' ? 'Inicio' : locale === 'pt' ? 'Início' : 'Home';
  const breadcrumbLd = JSON.stringify(
    breadcrumbJsonLd([
      { name: homeLabel, url: absoluteUrl(locale, '') },
    ])
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: appLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: siteLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: faqLd }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: breadcrumbLd }}
      />
      <HeroSection />
      <PillarsSection />
      <CompareSection />
      <ScenariosSection locale={locale} />
      <FAQSection />
      <MCPSection locale={locale} />
    </>
  );
}
