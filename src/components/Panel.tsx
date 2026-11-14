import type { ReactNode } from 'react';

export function Panel(props: { title?: string; id?: string; children: ReactNode; className?: string }) {
  const headingId = props.id ? `${props.id}-title` : undefined;
  return (
    <section className={`panel ${props.className ?? ''}`} aria-labelledby={headingId}>
      {props.title && (
        <h2 id={headingId} className="panel-title">
          {props.title}
        </h2>
      )}
      {props.children}
    </section>
  );
}
