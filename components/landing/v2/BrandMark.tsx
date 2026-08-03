import Image from "next/image";
import Link from "next/link";

import { APP_NAME, brand } from "@/lib/brand";
import { focus } from "@/components/landing/v2/config";

export function BrandMark() {
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 font-bold tracking-[0.08em] text-[#12211b] ${focus}`}
      aria-label={`${APP_NAME} home`}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-emerald-50">
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
