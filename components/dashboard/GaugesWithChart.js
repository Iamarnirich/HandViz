"use client";

import GaugesPanel from "./GaugesPanel";
import UtilisationSecteursChart from "./UtilisationSecteursChart";
import { useRapport } from "@/contexts/RapportContext";

export default function GaugesWithChart({ data }) {
  const { rapport } = useRapport();

  // On ne découpe pas ici, on appelle GaugesPanel avec tout le data
  return (
    <div className="flex flex-col items-center gap-6 mt-10">
      <div className="flex flex-col lg:flex-row items-start justify-center gap-6 w-full">
        <div className="w-full lg:w-[250px] flex flex-col gap-4">
          <GaugesPanel data={data} range="left" />
        </div>

        <div className="w-full max-w-2xl">
          <UtilisationSecteursChart data={data} />
        </div>

        <div className="w-full lg:w-[250px] flex flex-col gap-4">
          <GaugesPanel data={data} range="right" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-5xl mt-4">
        <GaugesPanel data={data} range="bottom" />
      </div>
    </div>
  );
}
