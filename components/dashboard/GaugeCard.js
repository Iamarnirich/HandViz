import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";

export default function GaugeCard({ label, value, count, color }) {
  return (
    <div className="bg-[#FAF3E0] border border-[#E4CDA1] rounded-2xl p-4 w-44 flex flex-col items-center shadow-lg">
      <p className="text-xs text-gray-600 font-medium mb-2">{count}</p>
      <div className="w-24 h-24">
        <CircularProgressbarWithChildren
          value={value}
          maxValue={100}
          styles={buildStyles({
            rotation: 0.75,
            strokeLinecap: "round",
            trailColor: "#1a1a1a",
            pathColor: color,
          })}
          circleRatio={0.5}
        >
          <div className="text-sm font-bold text-gray-900 mt-3">
            {`${value.toFixed(0)}%`}
          </div>
        </CircularProgressbarWithChildren>
      </div>
      <p className="mt-2 text-[12px] text-center text-gray-800 font-semibold">
        {label}
      </p>
    </div>
  );
}
