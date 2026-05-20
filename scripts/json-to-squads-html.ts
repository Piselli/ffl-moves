/**
 * Перетворює stdout `top21-player-breakdown.ts` на один зручний HTML для браузера.
 *
 *   NEXT_PUBLIC_MOVEMENT_RPC_URL=https://mainnet.movementnetwork.xyz/v1 \
 *     npx tsx scripts/top21-player-breakdown.ts 37 2>/dev/null | npx tsx scripts/json-to-squads-html.ts 37
 */
import * as fs from "fs";
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shortAddr(a: string): string {
  const t = a.trim();
  if (t.length <= 14) return t;
  return `${t.slice(0, 8)}…${t.slice(-6)}`;
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const gw = process.argv[2] ?? "37";
  const outName = process.argv[3] ?? `gw${gw}-squads-viewer.html`;
  const raw = await readStdin();
  const i = raw.indexOf("{");
  if (i < 0) {
    console.error("No JSON on stdin");
    process.exit(1);
  }
  type Row = {
    listPos: number;
    address: string;
    leaderboardSortPoints: number;
    xi: {
      slot: number;
      registered: string;
      countsAs: string;
      basePts: number;
    }[];
    bench: { player: string; rawPtsIfPlayed: number }[];
  };
  const d = JSON.parse(raw.slice(i)) as {
    gameweekId: number;
    chainStatus: string | null;
    sortMode: string;
    top21: Row[];
  };

  const nav = d.top21
    .map(
      (r) =>
        `<a class="toc-link" href="#team-${r.listPos}">#${r.listPos} · ${r.leaderboardSortPoints}</a>`,
    )
    .join("");

  const teams = d.top21
    .map((r) => {
      const rows = r.xi
        .map((s) => {
          const sub = s.countsAs.includes("автозаміна");
          const ca = esc(s.countsAs.replace(" [автозаміна]", ""));
          const reg = esc(s.registered);
          const cls = sub ? " row-sub" : "";
          const who = sub ? `${ca} <span class="sub-note">замість ${reg}</span>` : ca;
          return `<tr class="${cls.trim()}"><td>${s.slot}</td><td>${who}</td><td class="num">${s.basePts}</td></tr>`;
        })
        .join("");

      const bench = r.bench
        .map(
          (b) =>
            `<span class="chip" title="${esc(b.player)} — ${b.rawPtsIfPlayed} pts за GW">${esc(b.player.split("(")[0].trim())} <small>${b.rawPtsIfPlayed}</small></span>`,
        )
        .join("");

      return `
<article class="team" id="team-${r.listPos}" data-search="${esc(
        `${r.address} ${r.xi.map((x) => x.countsAs + x.registered).join(" ")} ${r.bench.map((b) => b.player).join(" ")}`,
      ).toLowerCase()}">
  <header class="team-head">
    <h2><span class="rank">#${r.listPos}</span> <span class="pts">${r.leaderboardSortPoints}</span> <span class="pts-label">очок</span></h2>
    <code class="wallet" title="${esc(r.address)}">${esc(shortAddr(r.address))}</code>
  </header>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Слот</th><th>Зараховано</th><th class="num">База</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="bench-block"><span class="bench-title">Лава</span><div class="chips">${bench}</div></div>
</article>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GW${d.gameweekId} — топ-21 склади</title>
  <style>
    :root {
      --bg: #0f1219;
      --card: #171b24;
      --border: #2a3142;
      --text: #e8eaef;
      --muted: #8b92a5;
      --accent: #6ee7b7;
      --sub: #422006;
      --sub-b: #fbbf24;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.45;
      font-size: 15px;
    }
    .wrap { max-width: 720px; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
    h1 { font-size: 1.35rem; font-weight: 700; margin: 0 0 0.35rem; }
    .lead { color: var(--muted); font-size: 0.9rem; margin: 0 0 1rem; }
    .toolbar {
      position: sticky; top: 0; z-index: 10;
      background: linear-gradient(180deg, var(--bg) 85%, transparent);
      padding: 0.75rem 0 1rem; margin: 0 0 0.5rem;
    }
    #q {
      width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px;
      border: 1px solid var(--border); background: var(--card); color: var(--text);
      font-size: 1rem; margin-bottom: 0.75rem;
    }
    #q::placeholder { color: var(--muted); }
    .toc {
      display: flex; flex-wrap: wrap; gap: 0.4rem;
    }
    .toc-link {
      font-size: 0.8rem; padding: 0.35rem 0.55rem; border-radius: 8px;
      background: var(--card); border: 1px solid var(--border); color: var(--accent);
      text-decoration: none;
    }
    .toc-link:hover { border-color: var(--accent); }
    .team {
      background: var(--card); border: 1px solid var(--border); border-radius: 14px;
      padding: 1rem 1.1rem 1.15rem; margin-bottom: 1rem;
    }
    .team.hidden { display: none; }
    .team-head {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.65rem;
    }
    .team-head h2 { margin: 0; font-size: 1.1rem; font-weight: 600; }
    .rank { color: var(--muted); font-weight: 500; }
    .pts { color: var(--accent); font-weight: 800; }
    .pts-label { color: var(--muted); font-weight: 500; font-size: 0.9em; }
    .wallet { font-size: 0.72rem; color: var(--muted); }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
    th {
      text-align: left; font-size: 0.68rem; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--muted); padding: 0.35rem 0.5rem 0.5rem 0;
      border-bottom: 1px solid var(--border);
    }
    th.num { text-align: right; }
    td {
      padding: 0.5rem 0.75rem 0.5rem 0; vertical-align: top;
      border-bottom: 1px solid var(--border);
    }
    td.num { text-align: right; font-weight: 700; color: var(--accent); white-space: nowrap; }
    tr:last-child td { border-bottom: none; }
    tr.row-sub td { background: rgba(251, 191, 36, 0.08); }
    .sub-note { display: block; font-size: 0.78rem; color: var(--muted); margin-top: 0.15rem; }
    .bench-block { margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px dashed var(--border); }
    .bench-title { font-size: 0.7rem; text-transform: uppercase; color: var(--muted); display: block; margin-bottom: 0.4rem; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .chip {
      font-size: 0.8rem; padding: 0.25rem 0.5rem; border-radius: 999px;
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
    }
    .chip small { color: var(--muted); margin-left: 0.2rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>GW${d.gameweekId} — топ-21</h1>
    <p class="lead">Mainnet · тур: <strong>${esc(d.chainStatus ?? "?")}</strong> · режим: <strong>${esc(d.sortMode)}</strong>. «База» — очки зарахованого гравця в слоті (до множників титулу/гільдії).</p>
    <div class="toolbar">
      <input type="search" id="q" placeholder="Пошук: гравець, місце #, очки…" autocomplete="off" />
      <nav class="toc" aria-label="Швидкі посилання">${nav}</nav>
    </div>
    <section id="teams">${teams}</section>
  </div>
  <script>
    document.getElementById("q").addEventListener("input", function () {
      var q = this.value.trim().toLowerCase();
      document.querySelectorAll(".team").forEach(function (card) {
        var hay = card.getAttribute("data-search") || "";
        if (!q || hay.indexOf(q) !== -1) card.classList.remove("hidden");
        else card.classList.add("hidden");
      });
    });
  </script>
</body>
</html>`;

  fs.writeFileSync(outName, html, "utf8");
  console.error("Wrote " + outName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
