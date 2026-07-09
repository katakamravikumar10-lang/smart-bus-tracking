import { Link } from "@tanstack/react-router";
import {
  APP_AUTHOR,
  APP_COPYRIGHT_YEAR,
  APP_DEPARTMENT,
  APP_INSTITUTION,
  APP_NAME,
  APP_VERSION,
} from "@/lib/version";

export function AppFooter() {
  return (
    <footer className="mt-10 border-t border-border/60 bg-background/60">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-6 text-xs text-muted-foreground sm:grid-cols-2 sm:items-center">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-foreground">
            {APP_NAME}{" "}
            <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              v{APP_VERSION}
            </span>
          </div>
          <div>
            Developed by <span className="font-medium text-foreground">{APP_AUTHOR}</span> · B.Tech, {APP_DEPARTMENT}
          </div>
          <div>{APP_INSTITUTION}</div>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:justify-end">
          <Link to="/about" className="hover:text-foreground hover:underline">
            About
          </Link>
          <Link to="/help" className="hover:text-foreground hover:underline">
            Help & Support
          </Link>
          <span>© {APP_COPYRIGHT_YEAR} All Rights Reserved</span>
        </div>
      </div>
    </footer>
  );
}