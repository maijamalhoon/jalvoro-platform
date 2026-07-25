import type { Metadata } from "next";

import ProductAuthRoute from "@/components/auth/ProductAuthRoute";
import {
  getProductExperience,
  listProductExperiences,
} from "@/lib/product-experiences";

export function generateStaticParams() {
  return listProductExperiences().map(({ slug }) => ({ experience: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ experience: string }>;
}): Promise<Metadata> {
  const { experience: slug } = await params;
  const experience = getProductExperience(slug);
  if (!experience) return {};

  return {
    title: `Sign in to ${experience.productName}`,
    description: experience.authContext,
    robots: { index: false, follow: false },
  };
}

export default function ExperienceLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ experience: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ProductAuthRoute
      mode="login"
      params={params}
      searchParams={searchParams}
    />
  );
}
