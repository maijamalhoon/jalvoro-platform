import ProductRealmAuth from "@/components/auth/ProductRealmAuth";

type BusinessLoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function BusinessLoginPage({
  searchParams,
}: BusinessLoginPageProps) {
  const params = await searchParams;
  return (
    <ProductRealmAuth
      realm="business"
      mode="login"
      next={params.next}
      initialError={params.error}
    />
  );
}
