"use client";

import { APP_NAME } from "@/lib/brand";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { CircleDollarSign, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import MobileHeaderSearch from "@/components/layout/MobileHeaderSearch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";

type MobileNavProps = {
  notificationSlot: ReactNode;
};

const TOP_VISIBILITY_THRESHOLD = 8;
const CONTROL_EASE = [0.22, 1, 0.36, 1] as const;

export default function MobileNav({ notificationSlot }: MobileNavProps) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [portalOpen, setPortalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const interactionOpen = open || portalOpen || searchOpen;

  useEffect(() => {
    const updatePortalState = () => {
      const mobileControlClusters = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mobile-control-cluster]"),
      );

      setPortalOpen(
        mobileControlClusters.some((cluster) =>
          Boolean(
            cluster.querySelector(
              '[aria-expanded="true"], [data-popup-open], [data-slot="dropdown-menu-content"]',
            ),
          ),
        ),
      );
    };

    updatePortalState();
    const observer = new MutationObserver(updatePortalState);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-expanded", "data-popup-open"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scrollContainer) return;

    const updateControlsVisibility = () => {
      const atPageTop =
        Math.max(0, scrollContainer.scrollTop) <= TOP_VISIBILITY_THRESHOLD;
      setControlsVisible(interactionOpen || atPageTop);
    };

    updateControlsVisibility();
    scrollContainer.addEventListener("scroll", updateControlsVisibility, {
      passive: true,
    });

    return () => {
      scrollContainer.removeEventListener("scroll", updateControlsVisibility);
    };
  }, [interactionOpen]);

  const controlTransition = reduceMotion
    ? { duration: 0.01 }
    : { duration: 0.36, ease: CONTROL_EASE };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <motion.div
          data-mobile-control-cluster
          data-mobile-header-badge-group="left"
          initial={false}
          animate={
            searchOpen
              ? { x: -88, opacity: 0, scale: 0.96 }
              : controlsVisible
                ? { x: 0, opacity: 1, scale: 1 }
                : { x: -88, opacity: 0, scale: 0.96 }
          }
          transition={controlTransition}
          aria-hidden={!controlsVisible || searchOpen}
          inert={!controlsVisible || searchOpen ? true : undefined}
          className={`fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-40 will-change-transform print:hidden lg:hidden ${
            controlsVisible && !searchOpen ? "" : "pointer-events-none"
          }`}
        >
          <SheetTrigger
            type="button"
            aria-label="Open navigation menu"
            className="finance-focus grid size-11 shrink-0 place-items-center rounded-[14px] border border-border bg-card/92 p-0 text-text-primary shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-elevated active:scale-[0.97] dark:border-border-strong/70 dark:bg-surface-elevated/92 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]"
          >
            <span
              aria-hidden="true"
              className="flex flex-col items-center justify-center gap-1.5"
            >
              <span className="h-0.5 w-5 rounded-full bg-current" />
              <span className="h-0.5 w-3 rounded-full bg-current" />
            </span>
          </SheetTrigger>
        </motion.div>

        <SheetContent
          data-mobile-navigation-drawer
          side="left"
          viewportClassName="mobile-navigation-viewport"
          showCloseButton={false}
          className="h-dvh max-h-dvh !w-[min(86vw,20rem)] max-w-[20rem] gap-0 overflow-hidden rounded-r-[26px] border-border/80 bg-surface-elevated/98 p-0 shadow-[24px_0_70px_rgb(15_23_42_/_0.2)] backdrop-blur-xl sm:!w-[22rem] sm:max-w-[22rem] dark:shadow-[24px_0_70px_rgb(0_0_0_/_0.48)]"
        >
          <SheetHeader className="border-b border-border/70 px-4 pb-3.5 pt-[max(0.95rem,env(safe-area-inset-top))] sm:px-4.5">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-brand text-primary-foreground shadow-[0_8px_18px_color-mix(in_srgb,var(--brand)_22%,transparent)]">
                  <CircleDollarSign
                    size={18}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate text-[16px] font-black tracking-[-0.02em] text-text-primary">
                    {APP_NAME}
                  </SheetTitle>
                  <SheetDescription className="mt-0.5 truncate text-[9.5px] font-bold uppercase tracking-[0.15em] text-text-tertiary">
                    Personal workspace
                  </SheetDescription>
                </div>
              </div>

              <SheetClose
                className="finance-focus grid h-10 w-10 shrink-0 place-items-center rounded-[13px] border border-transparent text-text-secondary transition-[background-color,border-color,color] hover:border-border hover:bg-surface-soft hover:text-text-primary"
                aria-label="Close navigation menu"
              >
                <X size={18} strokeWidth={2.2} aria-hidden="true" />
              </SheetClose>
            </div>
          </SheetHeader>

          <nav
            aria-label="Mobile dashboard navigation"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4.5"
          >
            <div className="space-y-3.5">
              {NAV_GROUPS.map((group) => {
                const singleItem = group.items.length === 1;

                return (
                  <section
                    key={group.label}
                    aria-labelledby={`mobile-navigation-${group.label.toLowerCase()}`}
                  >
                    <div className="mb-1.5 flex items-center gap-2 px-1.5">
                      <h2
                        id={`mobile-navigation-${group.label.toLowerCase()}`}
                        className="text-[9px] font-black uppercase tracking-[0.17em] text-text-tertiary"
                      >
                        {group.label}
                      </h2>
                      <span
                        className="h-px min-w-0 flex-1 bg-divider/60"
                        aria-hidden="true"
                      />
                    </div>

                    <div
                      className={
                        singleItem
                          ? "grid grid-cols-1 gap-2"
                          : "grid grid-cols-2 gap-2"
                      }
                    >
                      {group.items.map(({ label, href, icon: Icon }) => {
                        const active = isNavItemActive(pathname, href);

                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={`finance-focus group relative flex min-h-[3.25rem] min-w-0 items-center gap-2 rounded-[14px] border px-2.5 py-2 text-[12px] font-extrabold transition-[background-color,border-color,color,box-shadow,transform] active:scale-[0.985] sm:min-h-[3.45rem] sm:px-3 sm:text-[13px] ${
                              active
                                ? "border-brand bg-brand text-primary-foreground shadow-[0_8px_20px_color-mix(in_srgb,var(--brand)_20%,transparent)]"
                                : "border-transparent bg-surface-secondary/55 text-text-secondary hover:border-border/80 hover:bg-surface-soft hover:text-text-primary"
                            }`}
                          >
                            <span
                              className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-[background-color,color] ${
                                active
                                  ? "bg-white/15 text-primary-foreground"
                                  : "bg-surface-primary/85 text-text-secondary group-hover:text-brand"
                              }`}
                            >
                              <Icon
                                size={16}
                                strokeWidth={2.15}
                                aria-hidden="true"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      <MobileHeaderSearch
        controlsVisible={controlsVisible}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />

      <motion.div
        data-mobile-control-cluster
        data-mobile-header-badge-group="right"
        initial={false}
        animate={
          searchOpen
            ? { x: 152, opacity: 0, scale: 0.96 }
            : controlsVisible
              ? { x: 0, opacity: 1, scale: 1 }
              : { x: 152, opacity: 0, scale: 0.96 }
        }
        transition={controlTransition}
        aria-hidden={!controlsVisible || searchOpen}
        inert={!controlsVisible || searchOpen ? true : undefined}
        className={`fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-40 flex items-center gap-2 will-change-transform print:hidden lg:hidden ${
          controlsVisible && !searchOpen ? "" : "pointer-events-none"
        }`}
      >
        <div className="[&_button]:!size-11 [&_button]:!rounded-[14px] [&_button]:!border-border [&_button]:!bg-card/92 [&_button]:!text-text-primary [&_button]:!shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] [&_button]:!backdrop-blur-md [&_button]:hover:!-translate-y-0.5 [&_button]:hover:!border-brand/30 [&_button]:hover:!bg-surface-elevated [&_button]:active:!scale-[0.97] dark:[&_button]:!border-border-strong/70 dark:[&_button]:!bg-surface-elevated/92 dark:[&_button]:!shadow-[0_10px_24px_rgb(0_0_0_/_0.28)]">
          {notificationSlot}
        </div>
        <JamalMenu align="right" placement="bottom" variant="floating" />
      </motion.div>
    </>
  );
}
