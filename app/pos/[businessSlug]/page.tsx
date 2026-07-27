import type { Metadata } from "next";
import { notFound } from "next/navigation";

import BusinessPosTerminal from "@/components/business/BusinessPosTerminal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "POS Terminal",
  robots: { index: false, follow: false, noarchive: true },
};

function validSlug(value: string) {
  return /^[a-z0-9][a-z0-9-]{1,119}$/u.test(value);
}

export default async function PosTerminalPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  if (!validSlug(businessSlug)) notFound();
  return <BusinessPosTerminal businessSlug={businessSlug} />;
}
