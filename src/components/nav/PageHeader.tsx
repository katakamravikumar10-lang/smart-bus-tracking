import type { ReactNode } from "react";
import { BackButton } from "./BackButton";
import { Breadcrumbs, type BreadcrumbEntry } from "./Breadcrumbs";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  breadcrumbs?: BreadcrumbEntry[];
  /** Slot for right-aligned quick actions (Add, Export, Edit…). */
  actions?: ReactNode;
  /** Set to false on top-level dashboards / landing / auth pages. */
  showBackButton?: boolean;
  backFallbackTo?: string;
  className?: string;
};

/**
 * Consistent sub-page header: back button + breadcrumbs + title + actions.
 * Use on every route below the top-level dashboard.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  showBackButton = true,
  backFallbackTo = "/dashboard",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("animate-fade-in space-y-3 pb-2", className)}>
      {showBackButton && (
        <div className="flex items-center">
          <BackButton fallbackTo={backFallbackTo} />
        </div>
      )}
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}