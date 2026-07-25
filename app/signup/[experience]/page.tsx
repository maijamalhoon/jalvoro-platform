import type { Metadata } from "next";

import ProductAuthRoute from "@/components/auth/ProductAuthRoute";
import { APP_NAME } from "@/lib/brand";
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
    title: `Create ${experience.productName} account | ${APP_NAME}`,
    description: experience.authContext,
    robots: { index: false, follow: false },
  };
}

export default function ExperienceSignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ experience: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <ProductAuthRoute
      mode="signup"
      params={params}
      searchParams={searchParams}
    />
  );
}
