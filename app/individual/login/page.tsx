import ProductRealmAuth from "@/components/auth/ProductRealmAuth";

type IndividualLoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function IndividualLoginPage({
  searchParams,
}: IndividualLoginPageProps) {
  const params = await searchParams;
  return (
    <ProductRealmAuth
      realm="individual"
      mode="login"
      next={params.next}
      initialError={params.error}
    />
  );
}
