import ProductRealmAuth from "@/components/auth/ProductRealmAuth";

type IndividualSignupPageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function IndividualSignupPage({
  searchParams,
}: IndividualSignupPageProps) {
  const params = await searchParams;
  return <ProductRealmAuth realm="individual" mode="signup" next={params.next} />;
}
