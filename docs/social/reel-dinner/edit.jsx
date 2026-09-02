// JyutTranslate Reel — dinner / 口語 vs 書面 (~20s, 9:16)
// Beats: kinetic hook → strike 書面 → zoom real UI → CTA
// Child node `at` is absolute on this higgsedit — keep nodes full-beat;
// drive entrances with strictly-increasing opacity/scale keyframes.

const HARBOR = "#07131f";
const JADE = "#3dcfb6";
const INK = "#e8f4ff";
const MUTED = "#8aa0b5";
const STRIKE = "#ff5a5a";

const W = 1080;
const H = 1920;
const MARGIN = 72;
const FPS = 30;
const STEP = 1 / FPS;

export default async ({ project }) => {
  const p = await project({
    dir: "jyut-dinner-reel",
    size: `${W}x${H}`,
    fps: FPS,
    background: HARBOR,
  });

  const uiStill = await p.add("media/ui-reel-still.png");
  const uiResult = await p.add("media/ui-result.png");
  const logo = await p.add("media/logo-mark.png");

  const BEATS = [
    { id: "hook", dur: 3.4, build: beatHook },
    { id: "strike", dur: 4.0, build: beatStrike },
    { id: "reveal", dur: 8.2, build: (d) => beatReveal(d, uiStill, uiResult) },
    { id: "cta", dur: 4.4, build: (d) => beatCta(d, logo) },
  ];

  let at = 0;
  for (const beat of BEATS) {
    p.compose(beat.build(beat.dur), { at, dur: beat.dur, name: beat.id });
    at += beat.dur;
  }

  await p.frame(0.8, "renders/proof-hook.png");
  await p.frame(5.6, "renders/proof-strike.png");
  await p.frame(9.2, "renders/proof-ui.png");
  await p.frame(12.8, "renders/proof-zoom.png");
  await p.frame(18.5, "renders/proof-cta.png");

  if (process.env.SKIP_RENDER !== "1") {
    await p.render("renders/jyut-dinner-reel.mp4");
  }
};

/** Strictly increasing keyframes — engine refuses equal `at`. */
function chain(property, dur, points) {
  const out = [];
  let last = -STEP;
  for (const [tRaw, value, easing] of points) {
    let t = Math.max(0, Math.min(Number(tRaw), dur - STEP * 0.5));
    if (t <= last) t = last + STEP;
    const kf = { at: Number(t.toFixed(4)), value };
    if (easing) kf.easing = easing;
    out.push(kf);
    last = t;
  }
  return { property, keyframes: out };
}

function fadeIn(start, dur) {
  return chain("opacity", dur, [
    [0, 0],
    [start, 0],
    [start + 0.35, 1],
    [dur - 0.08, 1],
  ]);
}

function beatHook(dur) {
  return (
    <group name="hook">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />
      <group
        name="jade-bar"
        x={MARGIN}
        y={240}
        width={6}
        height={420}
        origin="center"
        animate={[
          chain("scaleY", dur, [
            [0, 0],
            [0.15, 0],
            [0.7, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={6} height={420} fill={JADE} />
      </group>
      <text
        x={MARGIN + 28}
        y={280}
        width={W - MARGIN * 2 - 28}
        fontFamily="Anton"
        fontSize={92}
        lineHeight={1.05}
        color={INK}
        motion={{
          by: "word",
          from: { y: 48, opacity: 0 },
          overlap: 0.55,
          duration: 0.45,
          easing: "house",
        }}
      >
        {"Most apps\ntranslate Chinese."}
      </text>
      <text
        x={MARGIN + 28}
        y={720}
        width={W - MARGIN * 2 - 28}
        fontFamily="Anton"
        fontSize={108}
        color={JADE}
        motion={{
          by: "word",
          from: { y: 56, opacity: 0, scale: 0.92 },
          overlap: 0.45,
          duration: 0.5,
          easing: "house",
        }}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [1.2, 0],
            [1.55, 1],
            [dur - 0.4, 1],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        Not Cantonese.
      </text>
    </group>
  );
}

function beatStrike(dur) {
  const lineW = W - MARGIN * 2;
  const lineY = 980;
  const strikeW = Math.min(lineW, 780);
  return (
    <group name="strike">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />
      <text
        x={MARGIN}
        y={320}
        width={lineW}
        fontFamily="Inter"
        fontSize={28}
        fontWeight={600}
        letterSpacing={4}
        color={MUTED}
        animate={[fadeIn(0.05, dur)]}
      >
        GOOGLE / APPLE GIVE YOU
      </text>
      <text
        x={MARGIN}
        y={400}
        width={lineW}
        fontFamily="Inter"
        fontSize={44}
        fontWeight={600}
        color={INK}
        animate={[fadeIn(0.2, dur)]}
      >
        {"Are you coming home\nfor dinner?"}
      </text>
      <text
        x={MARGIN}
        y={620}
        width={lineW}
        fontFamily="Noto Sans TC"
        fontSize={28}
        color={STRIKE}
        animate={[fadeIn(0.7, dur)]}
      >
        書面 · WRITTEN MANDARIN
      </text>
      <text
        x={MARGIN}
        y={lineY - 120}
        width={lineW}
        fontFamily="Noto Sans TC"
        fontSize={72}
        color={INK}
        animate={[fadeIn(1.0, dur)]}
      >
        你回家吃晚飯嗎？
      </text>
      <group
        name="strike-bar"
        x={MARGIN}
        y={lineY - 72}
        width={strikeW}
        height={6}
        origin="center"
        animate={[
          chain("scaleX", dur, [
            [0, 0],
            [1.45, 0],
            [2.0, 1, "house"],
            [dur - 0.08, 1],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [1.4, 0],
            [1.55, 1],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={strikeW} height={6} fill={STRIKE} />
      </group>
      <text
        x={MARGIN}
        y={1280}
        width={lineW}
        fontFamily="Inter"
        fontSize={36}
        fontWeight={600}
        color={MUTED}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [2.3, 0],
            [2.7, 1],
            [dur - 0.35, 1],
            [dur - 0.08, 0.35],
          ]),
        ]}
      >
        That is not how families talk.
      </text>
    </group>
  );
}

function beatReveal(dur, uiStill, uiResult) {
  const cardW = W - MARGIN * 2;
  const cardH = Math.round(cardW * (550 / 900));
  const cardY = 480;
  return (
    <group name="reveal">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />

      {/* Full-bleed real UI still with slow Ken Burns */}
      <group
        name="phone"
        x={0}
        y={0}
        width={W}
        height={H}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 1.0],
            [0.6, 1.04, "house"],
            [dur - 0.08, 1.22, "ease-in-out"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.4, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <media file={uiStill} x={0} y={0} width={W} height={H} fit="cover" />
      </group>

      {/* Soft top scrim so header type stays readable */}
      <rect
        x={0}
        y={0}
        width={W}
        height={420}
        fill={{
          kind: "linear",
          angle: 90,
          stops: [
            { offset: 0, color: "rgba(7,19,31,0.92)" },
            { offset: 1, color: "rgba(7,19,31,0)" },
          ],
        }}
      />

      <text
        x={MARGIN}
        y={180}
        width={cardW}
        fontFamily="Noto Sans TC"
        fontSize={28}
        color={JADE}
        animate={[fadeIn(0.05, dur)]}
      >
        REAL 口語粵語
      </text>
      <text
        x={MARGIN}
        y={240}
        width={cardW}
        fontFamily="Anton"
        fontSize={64}
        color={INK}
        motion={{
          by: "word",
          from: { y: 36, opacity: 0 },
          overlap: 0.5,
          duration: 0.4,
          easing: "house",
        }}
      >
        {"What they actually say"}
      </text>

      {/* Close-up of the translation result card */}
      <group
        name="result-card"
        x={MARGIN}
        y={cardY}
        width={cardW}
        height={cardH + 24}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.94],
            [3.0, 0.94],
            [3.55, 1.0, "house"],
            [dur - 0.08, 1.05, "ease-in-out"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [2.95, 0],
            [3.35, 1],
            [dur - 0.45, 1],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={cardW}
          height={cardH + 24}
          fill={HARBOR}
          radius={28}
        />
        <media
          file={uiResult}
          x={12}
          y={12}
          width={cardW - 24}
          height={cardH}
          fit="cover"
          radius={20}
        />
      </group>

      <text
        x={MARGIN}
        y={H - 220}
        width={cardW}
        fontFamily="Noto Sans TC"
        fontSize={34}
        color={INK}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.7, 0],
            [1.15, 1],
            [dur - 0.55, 1],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        你返唔返嚟食飯㗎？
      </text>
      <text
        x={MARGIN}
        y={H - 160}
        width={cardW}
        fontFamily="JetBrains Mono"
        fontSize={22}
        color={JADE}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [1.0, 0],
            [1.4, 1],
            [dur - 0.55, 1],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3
      </text>
    </group>
  );
}

function beatCta(dur, logo) {
  return (
    <group name="cta">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill={{
          kind: "radial",
          angle: 0,
          stops: [
            { offset: 0, color: "#0c2436" },
            { offset: 1, color: HARBOR },
          ],
        }}
      />
      <group
        name="logo-wrap"
        x={W / 2 - 72}
        y={560}
        width={144}
        height={144}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.82],
            [0.55, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <media file={logo} x={0} y={0} width={144} height={144} fit="contain" />
      </group>
      <text
        x={MARGIN}
        y={760}
        width={W - MARGIN * 2}
        fontFamily="Anton"
        fontSize={72}
        align="center"
        color={INK}
        animate={[fadeIn(0.25, dur)]}
      >
        JyutTranslate
      </text>
      <text
        x={MARGIN}
        y={870}
        width={W - MARGIN * 2}
        fontFamily="Inter"
        fontSize={34}
        fontWeight={600}
        align="center"
        color={JADE}
        animate={[fadeIn(0.45, dur)]}
      >
        Real Hong Kong Cantonese
      </text>
      <text
        x={MARGIN}
        y={1020}
        width={W - MARGIN * 2}
        fontFamily="Inter"
        fontSize={40}
        fontWeight={700}
        align="center"
        color={INK}
        animate={[fadeIn(0.7, dur)]}
      >
        jyuttranslate.com
      </text>
      <text
        x={MARGIN}
        y={1120}
        width={W - MARGIN * 2}
        fontFamily="Inter"
        fontSize={28}
        align="center"
        color={MUTED}
        animate={[fadeIn(1.0, dur)]}
      >
        Try Conversation mode · Free to start
      </text>
      <group
        name="cta-rule"
        x={W / 2 - 80}
        y={1240}
        width={160}
        height={6}
        origin="center"
        animate={[
          chain("scaleX", dur, [
            [0, 0],
            [1.05, 0],
            [1.5, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={160} height={6} fill={JADE} radius={3} />
      </group>
    </group>
  );
}
