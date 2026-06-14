import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerSize = "app" | "public" | "wide";

const sizeClassNames: Record<PageContainerSize, string> = {
  app: "max-w-3xl",
  public: "max-w-xl",
  wide: "max-w-6xl"
};

export function PageContainer({
  children,
  className,
  size = "wide"
}: {
  children: ReactNode;
  className?: string;
  size?: PageContainerSize;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 md:px-6", sizeClassNames[size], className)}>
      {children}
    </div>
  );
}
