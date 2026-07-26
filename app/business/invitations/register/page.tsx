import { redirect } from "next/navigation";

import ProductRealmAuth from "@/components/auth/ProductRealmAuth";
import {
  getBusinessInvitationAcceptancePath,
  normalizeBusinessInvitationToken,
} from "@/lib/business/invitations";

type BusinessInvitationRegistrationPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function BusinessInvitationRegistrationPage({
  searchParams,
}: BusinessInvitationRegistrationPageProps) {
  const token = normalizeBusinessInvitationToken((await searchParams).token);
  if (!token) redirect("/business/invitations/accept");

  return (
    <ProductRealmAuth
      realm="business"
      mode="signup"
      next={getBusinessInvitationAcceptancePath(token)}
    />
  );
}
