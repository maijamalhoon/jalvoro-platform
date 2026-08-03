import Image from "next/image";
import Link from "next/link";

import { focus } from "@/components/landing/v2/config";
import { APP_NAME, brand } from "@/lib/brand";

export function BrandMark() {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-[0.08em] text-text-primary ${focus}`}
      aria-label={`${APP_NAME} home`}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-success-soft">
        <Image
          src={brand.assets.logoMark}
          alt=""
          width={31}
          height={31}
          priority
        />
      </span>
      <span>{APP_NAME}</span>
    </Link>
  );
}
