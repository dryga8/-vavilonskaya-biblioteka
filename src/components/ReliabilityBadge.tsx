export function ReliabilityBadge({
  reliability,
}: {
  reliability: string | null | undefined;
}) {
  if (!reliability) return null;

  if (reliability === 'approved') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 10,
          fontFamily: 'monospace',
          background: '#1a4a1a',
          color: '#4ade80',
          border: '1px solid #22c55e',
          borderRadius: 3,
          padding: '2px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        ✓ Верим
      </span>
    );
  }

  if (reliability === 'caution') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 3,
          fontSize: 10,
          fontFamily: 'monospace',
          background: '#4a3a00',
          color: '#fbbf24',
          border: '1px solid #f59e0b',
          borderRadius: 3,
          padding: '2px 6px',
          whiteSpace: 'nowrap',
        }}
      >
        ⚠ С осторожностью
      </span>
    );
  }

  return null;
}
