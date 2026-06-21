// Consistent section wrapper for the listing page.
// Handles the id for scrollspy, heading, and scroll-margin offset for the sticky tab bar.

interface SectionProps {
  id: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, title, children, className = "" }: SectionProps) {
  return (
    <section id={id} className={`scroll-mt-36 pt-8 first:pt-0 ${className}`}>
      {title && (
        <h2 className="text-xl font-bold text-slate-900 mb-5">{title}</h2>
      )}
      {children}
    </section>
  );
}
