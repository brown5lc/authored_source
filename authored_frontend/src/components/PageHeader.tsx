type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e0e0e0' }}>{title}</p>
      {subtitle && (
        <p style={{ margin: '3px 0 0', fontSize: 13, color: '#666' }}>{subtitle}</p>
      )}
    </div>
  );
}
