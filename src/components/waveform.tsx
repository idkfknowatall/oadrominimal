'use client';

interface WaveformProps {
  data: number[];
  duration: number;
}

export default function Waveform({ data, duration }: WaveformProps) {
  // Use a fixed height for the internal coordinate system
  const height = 96;
  // The width of the internal coordinate system is the song duration, with a fallback.
  const width = duration > 0 ? duration : 512;

  const createPath = (): string => {
    if (data.length === 0) {
      return '';
    }

    let topPath = '';
    let bottomPath = '';

    data.forEach((point, i) => {
      const amp = Math.min(1, point * 2.5); // Amplify and clamp the RMS value
      const barHeight = Math.max(0.5, amp * (height / 2)); // Give it a minimum height
      const x = i;

      topPath += ` L ${x.toFixed(2)},${(height / 2 - barHeight).toFixed(2)}`;
      // Prepend to the bottom path to build it in reverse
      bottomPath =
        `L ${x.toFixed(2)},${(height / 2 + barHeight).toFixed(2)} ` +
        bottomPath;
    });

    const finalPath = `M 0,${height / 2} ${topPath} ${bottomPath} Z`;
    return finalPath;
  };

  const pathData = createPath();
  const baseLinePath = `M 0,${height / 2} L ${width},${height / 2}`;

  return (
    <div className="relative flex h-24 w-full items-center justify-center overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <path
          d={baseLinePath}
          stroke="hsl(var(--foreground) / 0.5)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={pathData}
          fill="hsl(var(--primary) / 0.4)"
          stroke="hsl(var(--primary))"
          strokeWidth="1"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
