import { Link } from "@tanstack/react-router";
import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

export type BreadcrumbEntry = {
  label: string;
  /** Optional destination. Omit on the final (current-page) entry. */
  to?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbEntry[];
  className?: string;
};

/**
 * Accessible breadcrumb trail. The last item is rendered as the current page
 * with `aria-current="page"`; earlier items are clickable links.
 */
export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <Breadcrumb className={cn("text-xs sm:text-sm", className)}>
      <BreadcrumbList>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <BreadcrumbItem>
                {isLast || !item.to ? (
                  <BreadcrumbPage className="max-w-[12rem] truncate font-medium text-foreground">
                    {item.label}
                  </BreadcrumbPage>
                ) : (
                  <Link
                    to={item.to}
                    className="max-w-[10rem] truncate transition-colors hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </BreadcrumbSeparator>
              )}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}