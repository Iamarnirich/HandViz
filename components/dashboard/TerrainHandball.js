import Image from "next/image";

const secteurs = {
  ALG: { label: "Aile Gauche", top: "24%", left: "18%", value: 6.9 },
  ARG: { label: "Arrière Gauche", top: "38%", left: "22%", value: 3.0 },
  "Central 6m": { label: "6m-central", top: "58%", left: "50%", value: 26.7 },
  "Central 9m": { label: "9m-central", top: "42%", left: "50%", value: 16.8 },
  "Central 7-9m": {
    label: "central 7-9m",
    top: "32%",
    left: "50%",
    value: 13.9,
  },
  "1-2G": { label: "1-2G", top: "66%", left: "32%", value: 12.9 },
  ALD: { label: "Aile Droit", top: "24%", left: "82%", value: 5.9 },
  ARD: { label: "Arrière Droit", top: "38%", left: "78%", value: 2.0 },
  "1-2D": { label: "1-2D", top: "66%", left: "68%", value: 5.9 },
  "7M": { label: "7M", top: "48%", left: "50%", value: 5.9 },
};

export default function TerrainHandball() {
  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[2/1] rounded-xl overflow-hidden shadow-2xl border border-gray-300 bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain de handball"
        fill
        className="object-cover brightness-[0.9]"
      />
      {Object.entries(secteurs).map(([key, pos]) => (
        <div
          key={key}
          className="absolute text-xs gap-6 font-semibold text-white bg-[#D4AF37]/95 px-2 py-1 rounded-full shadow-lg backdrop-blur-sm"
          style={{
            top: pos.top,
            left: pos.left,
            transform: "translate(-50%, -50%)",
          }}
        >
          <span className="text-[10px] font-semibold bg-black/70 text-white px-1.5 py-[1px] rounded-sm">
            {pos.label}
          </span>
          {pos.value.toFixed(1)}%
        </div>
      ))}
    </div>
  );
}
