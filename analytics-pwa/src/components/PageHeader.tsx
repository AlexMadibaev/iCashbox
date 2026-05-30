type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export function PageHeader({ kicker, subtitle, title }: Props) {
  return (
    <section className="page-header">
      {kicker && <span>{kicker}</span>}
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </section>
  );
}
