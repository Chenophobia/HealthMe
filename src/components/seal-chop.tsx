export function SealChop({ char = "垚" }: { char?: string }) {
  return (
    <div
      className="absolute bottom-5 right-5 w-14 h-14 rounded flex items-center justify-center font-bold text-2xl shadow-lg"
      style={{
        background: "var(--accent)",
        color: "#f4ecd8",
        transform: "rotate(-6deg)",
        opacity: 0.9,
      }}
    >
      {char}
    </div>
  );
}
