import { redirect } from "next/navigation";

import ProductRealmAuth, {
  type BusinessProduct,
} from "@/components/auth/ProductRealmAuth";

type BusinessSignupPageProps = {
  searchParams: Promise<{ product?: string; next?: string }>;
};

function normalizeProduct(value: string | undefined): BusinessProduct | null {
  return value === "solo_business" ||
    value === "retail_pos" ||
    value === "growing_business" ||
    value === "enterprise"
    ? value
    : null;
}

export default async function BusinessSignupPage({
  searchParams,
}: BusinessSignupPageProps) {
  const params = await searchParams;
  const product = normalizeProduct(params.product);
  if (!product) redirect("/business/register");

  return (
    <ProductRealmAuth
      realm="business"
      mode="signup"
      product={product}
      next={params.next}
    />
  );
}
