// components/comparateur/JoueuseCard.js

export function JoueuseCard({ data }) {
  const { nom, attaque, defense, passe } = data;
  const total = attaque + defense + passe;
  const ratio = total ? Math.round(((attaque + defense) / total) * 100) : 0;

  return (
    <div className="bg-white shadow rounded-xl p-4 space-y-2">
      <h2 className="text-lg font-semibold text-gray-800">{nom}</h2>
      <p className="text-sm text-gray-500">Total actions : {total}</p>
      <ul className="text-sm space-y-1">
        <li>
          ⚔️ Attaques (+) : <strong>{attaque}</strong>
        </li>
        <li>
          🛡️ Défenses (-) : <strong>{defense}</strong>
        </li>
        <li>
          🎯 Passes décisives : <strong>{passe}</strong>
        </li>
        <li>
          📈 Ratio performance : <strong>{ratio}%</strong>
        </li>
      </ul>
    </div>
  );
}
