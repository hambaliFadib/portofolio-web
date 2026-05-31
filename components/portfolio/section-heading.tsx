import { MarkedText } from "@/components/marked-text";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  const alignment =
    align === "center"
      ? "mx-auto max-w-3xl text-center"
      : "max-w-[46rem]";

  return (
    <div className={cn("space-y-3 sm:space-y-4", alignment, className)}>
      <p className="font-mono text-[11px] font-medium uppercase text-primary/80">
        <MarkedText text={eyebrow} />
      </p>
      <h2 className="text-balance text-[2rem] font-semibold text-foreground sm:text-[2.35rem] lg:text-[2.65rem]">
        <MarkedText text={title} />
      </h2>
      <p className="text-pretty text-[15px] leading-7 text-muted-foreground md:text-lg md:leading-8">
        <MarkedText text={description} />
      </p>
    </div>
  );
}
