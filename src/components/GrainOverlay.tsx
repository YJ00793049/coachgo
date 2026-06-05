// Faint warm film grain over the whole page — adds analog texture to the
// off-white paper without darkening it. Very low opacity, multiply blend.
export default function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none z-[9999] grain-light"
      style={{
        opacity: 0.03,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
