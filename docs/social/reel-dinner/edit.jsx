// JyutTranslate Reel v3 — dinner / 口語 vs 書面 (~23s, 9:16)
// Brand: Harbor / Jade / Ink · Syne + Noto Sans HK · docs/brand/favicon.png
// Motion: kinetic type → strike → Ken Burns INTO translation → pull → INTO variations → CTA
// No left/right bobbing on a full-page screenshot.

const HARBOR = "#07131f";
const HARBOR_MID = "#0a1c2c";
const JADE = "#3dcfb6";
const JADE_BRIGHT = "#7ef0dc";
const INK = "#e8f4ff";
const MUTED = "#8aa0b5";
const STRIKE = "#ff5a5a";

const W = 1080;
const H = 1920;
const MARGIN = 64;
const FPS = 30;
const STEP = 1 / FPS;

export default async ({ project }) => {
  const p = await project({
    dir: "jyut-dinner-reel-v3",
    size: `${W}x${H}`,
    fps: FPS,
    background: HARBOR,
  });

  const uiStill = await p.add("media/ui-reel-still.png");
  const logo = await p.add("media/logo-mark.png"); // docs/brand/favicon.png

  const BEATS = [
    { id: "hook", dur: 3.0, build: beatHook },
    { id: "strike", dur: 3.6, build: beatStrike },
    { id: "reveal", dur: 12.0, build: (d) => beatReveal(d, uiStill) },
    { id: "cta", dur: 4.4, build: (d) => beatCta(d, logo) },
  ];

  let at = 0;
  for (const beat of BEATS) {
    p.compose(beat.build(beat.dur), {
      at,
      dur: beat.dur,
      name: beat.id,
    });
    at += beat.dur;
  }

  await p.frame(0.8, "renders/proof-hook.png");
  await p.frame(4.8, "renders/proof-strike.png");
  await p.frame(7.4, "renders/proof-establish.png");
  await p.frame(9.8, "renders/proof-zoom-translation.png");
  await p.frame(13.6, "renders/proof-zoom-variations.png");
  await p.frame(16.8, "renders/proof-variations-hold.png");
  await p.frame(20.5, "renders/proof-cta.png");

  if (process.env.SKIP_RENDER !== "1") {
    await p.render("renders/jyut-dinner-reel.mp4");
  }
};

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

function fadeIn(start, dur, holdEnd = 0.08) {
  return chain("opacity", dur, [
    [0, 0],
    [start, 0],
    [start + 0.28, 1, "house"],
    [dur - holdEnd, 1],
  ]);
}

function beatHook(dur) {
  return (
    <group name="hook">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />
      <group
        name="glow"
        x={W / 2 - 420}
        y={H / 2 - 520}
        width={840}
        height={840}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.88],
            [1.4, 1.06, "ease-in-out"],
            [dur - 0.08, 0.98, "ease-in-out"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.3, 0.5, "house"],
            [dur - 0.08, 0.32],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={840}
          height={840}
          radius={420}
          fill={{
            kind: "radial",
            angle: 0,
            stops: [
              { offset: 0, color: "rgba(61,207,182,0.26)" },
              { offset: 0.55, color: "rgba(18,50,74,0.16)" },
              { offset: 1, color: "rgba(7,19,31,0)" },
            ],
          }}
        />
      </group>

      <rect x={MARGIN} y={260} width={6} height={400} fill={JADE} radius={3} />

      <text
        x={MARGIN + 28}
        y={300}
        width={W - MARGIN * 2 - 28}
        fontFamily="Syne"
        fontSize={88}
        fontWeight={700}
        lineHeight={1.06}
        letterSpacing={-1.5}
        color={INK}
        motion={{
          by: "word",
          from: { y: 52, opacity: 0 },
          overlap: 0.55,
          duration: 0.4,
          easing: "house",
        }}
      >
        {"Most apps\ntranslate Chinese."}
      </text>

      <text
        x={MARGIN + 28}
        y={760}
        width={W - MARGIN * 2 - 28}
        fontFamily="Syne"
        fontSize={104}
        fontWeight={700}
        letterSpacing={-2}
        color={JADE}
        motion={{
          by: "word",
          from: { y: 56, opacity: 0, scale: 0.92 },
          overlap: 0.4,
          duration: 0.46,
          easing: "house",
        }}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.95, 0],
            [1.3, 1],
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
        y={300}
        width={lineW}
        fontFamily="Noto Sans"
        fontSize={26}
        fontWeight={600}
        letterSpacing={4}
        color={MUTED}
        animate={[fadeIn(0.04, dur)]}
      >
        GOOGLE / APPLE GIVE YOU
      </text>
      <text
        x={MARGIN}
        y={380}
        width={lineW}
        fontFamily="Syne"
        fontSize={46}
        fontWeight={700}
        letterSpacing={-0.5}
        color={INK}
        animate={[fadeIn(0.16, dur)]}
      >
        {"Are you coming home\nfor dinner?"}
      </text>
      <text
        x={MARGIN}
        y={600}
        width={lineW}
        fontFamily="Noto Sans HK"
        fontSize={28}
        fontWeight={700}
        color={STRIKE}
        animate={[fadeIn(0.55, dur)]}
      >
        書面 · WRITTEN MANDARIN
      </text>
      <text
        x={MARGIN}
        y={lineY - 120}
        width={lineW}
        fontFamily="Noto Sans HK"
        fontSize={70}
        fontWeight={700}
        color={INK}
        animate={[fadeIn(0.85, dur)]}
      >
        你回家吃晚飯嗎？
      </text>
      <group
        name="strike-bar"
        x={MARGIN}
        y={lineY - 72}
        width={strikeW}
        height={7}
        origin="center"
        animate={[
          chain("scaleX", dur, [
            [0, 0],
            [1.2, 0],
            [1.75, 1, "house"],
            [dur - 0.08, 1],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [1.15, 0],
            [1.3, 1],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={strikeW} height={7} fill={STRIKE} radius={3} />
      </group>
      <text
        x={MARGIN}
        y={1260}
        width={lineW}
        fontFamily="Noto Sans"
        fontSize={34}
        fontWeight={600}
        color={MUTED}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [2.0, 0],
            [2.4, 1, "house"],
            [dur - 0.3, 1],
            [dur - 0.08, 0.25],
          ]),
        ]}
      >
        That is not how families talk.
      </text>
    </group>
  );
}

/**
 * Ken Burns on the real Solo UI still:
 * 1) brief establish (readable context)
 * 2) punch INTO the main translation + Jyutping
 * 3) pull, then dive INTO OTHER VARIATIONS
 * No lateral bobbing / orbit wobble.
 */
function beatReveal(dur, uiStill) {
  const lineW = W - MARGIN * 2;
  return (
    <group name="reveal">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />

      {/* Camera on the full UI still — scale + vertical pan only */}
      <group
        name="ui-camera"
        x={0}
        y={0}
        width={W}
        height={H}
        origin="center"
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.28, 1, "house"],
            [dur - 0.08, 1],
          ]),
          // Establish → punch translation → ease → dive variations
          // Scales are aggressive so 口語 is phone-readable (not a tiny full-page still)
          chain("scale", dur, [
            [0, 1.08],
            [0.95, 1.18, "ease-out"],
            [1.2, 1.18],
            [2.4, 3.05, "house"], // hard punch INTO primary translation
            [5.0, 3.15, "ease-in-out"],
            [5.9, 1.55, "house"], // clear pull so the next dive reads
            [6.4, 1.55],
            [8.0, 3.2, "house"], // hard punch INTO variations cards
            [dur - 0.08, 3.35, "ease-in-out"],
          ]),
          // Translation sits upper-mid on the still → pan down (positive Y)
          // Variations sit lower → pan up (negative Y)
          chain("offsetY", dur, [
            [0, 30],
            [0.95, 10, "ease-out"],
            [1.2, 10],
            [2.4, 290, "house"],
            [5.0, 310, "ease-in-out"],
            [5.9, 20, "house"],
            [6.4, 20],
            [8.0, -360, "house"],
            [dur - 0.08, -390, "ease-in-out"],
          ]),
          // Keep X locked — no bob
          chain("offsetX", dur, [
            [0, 0],
            [dur - 0.08, 0],
          ]),
          chain("rotation", dur, [
            [0, 0],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        <media file={uiStill} x={0} y={0} width={W} height={H} fit="cover" />
      </group>

      {/* Top scrim + labels */}
      <rect
        x={0}
        y={0}
        width={W}
        height={320}
        fill={{
          kind: "linear",
          angle: 90,
          stops: [
            { offset: 0, color: "rgba(7,19,31,0.96)" },
            { offset: 1, color: "rgba(7,19,31,0)" },
          ],
        }}
      />

      <text
        x={MARGIN}
        y={72}
        width={lineW}
        fontFamily="Noto Sans HK"
        fontSize={26}
        fontWeight={700}
        color={JADE}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.25, 1, "house"],
            [5.25, 1],
            [5.7, 0],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        REAL 口語粵語
      </text>
      <text
        x={MARGIN}
        y={118}
        width={lineW}
        fontFamily="Syne"
        fontSize={44}
        fontWeight={700}
        letterSpacing={-1}
        color={INK}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.35, 1, "house"],
            [5.25, 1],
            [5.7, 0],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        Read the real line
      </text>

      {/* Readable callout while parked on the translation */}
      <group
        name="translation-callout"
        x={MARGIN}
        y={H - 420}
        width={lineW}
        height={280}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [2.25, 0],
            [2.7, 1, "house"],
            [5.2, 1],
            [5.7, 0],
            [dur - 0.08, 0],
          ]),
          chain("offsetY", dur, [
            [0, 36],
            [2.25, 36],
            [2.75, 0, "house"],
            [5.2, 0],
            [5.7, 24],
            [dur - 0.08, 24],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={lineW}
          height={280}
          radius={28}
          fill="rgba(7,19,31,0.88)"
        />
        <text
          x={28}
          y={36}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={22}
          fontWeight={600}
          letterSpacing={2}
          color={JADE}
        >
          PRIMARY · 口語
        </text>
        <text
          x={28}
          y={86}
          width={lineW - 56}
          fontFamily="Noto Sans HK"
          fontSize={48}
          fontWeight={700}
          color={INK}
        >
          你返唔返嚟食飯㗎？
        </text>
        <text
          x={28}
          y={170}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={26}
          fontWeight={600}
          color={JADE_BRIGHT}
        >
          nei5 faan2 m4 faan1 lai4 sik6 faan6 gaa3
        </text>
        <text
          x={28}
          y={220}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={22}
          fontWeight={500}
          color={MUTED}
        >
          Are you coming back for dinner?
        </text>
      </group>

      {/* Variations chapter label */}
      <text
        x={MARGIN}
        y={72}
        width={lineW}
        fontFamily="Noto Sans HK"
        fontSize={26}
        fontWeight={700}
        color={JADE}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [5.75, 0],
            [6.2, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        OTHER VARIATIONS · 其他講法
      </text>
      <text
        x={MARGIN}
        y={118}
        width={lineW}
        fontFamily="Syne"
        fontSize={44}
        fontWeight={700}
        letterSpacing={-1}
        color={INK}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [5.85, 0],
            [6.3, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        Same meaning · different mouth
      </text>

      {/* Readable variation callouts while zoomed on the list */}
      <group
        name="variations-callout"
        x={MARGIN}
        y={H - 460}
        width={lineW}
        height={340}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [7.7, 0],
            [8.25, 1, "house"],
            [dur - 0.35, 1],
            [dur - 0.08, 0],
          ]),
          chain("offsetY", dur, [
            [0, 40],
            [7.7, 40],
            [8.3, 0, "house"],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={lineW}
          height={340}
          radius={28}
          fill="rgba(7,19,31,0.9)"
        />
        <text
          x={28}
          y={32}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={20}
          fontWeight={600}
          letterSpacing={2}
          color={JADE}
        >
          TAP ANY · ALTERNATE 口語
        </text>
        <text
          x={28}
          y={82}
          width={lineW - 56}
          fontFamily="Noto Sans HK"
          fontSize={36}
          fontWeight={700}
          color={INK}
        >
          你返唔返嚟食飯呀？
        </text>
        <text
          x={28}
          y={140}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={22}
          fontWeight={500}
          color={MUTED}
        >
          Soft 呀 ending · everyday ask
        </text>
        <text
          x={28}
          y={200}
          width={lineW - 56}
          fontFamily="Noto Sans HK"
          fontSize={36}
          fontWeight={700}
          color={INK}
        >
          你返唔返屋企食飯呀？
        </text>
        <text
          x={28}
          y={258}
          width={lineW - 56}
          fontFamily="Noto Sans"
          fontSize={22}
          fontWeight={500}
          color={MUTED}
        >
          屋企 · home · family dinner
        </text>
      </group>
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
        x={W / 2 - 88}
        y={540}
        width={176}
        height={176}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.82],
            [0.5, 1.05, "house"],
            [0.85, 1.0, "ease-out"],
            [dur - 0.08, 1],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.18, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <media file={logo} x={0} y={0} width={176} height={176} fit="contain" />
      </group>

      <text
        x={MARGIN}
        y={780}
        width={W - MARGIN * 2}
        fontFamily="Syne"
        fontSize={68}
        fontWeight={700}
        letterSpacing={-1.5}
        align="center"
        color={INK}
        animate={[fadeIn(0.28, dur)]}
      >
        JyutTranslate
      </text>
      <text
        x={MARGIN}
        y={880}
        width={W - MARGIN * 2}
        fontFamily="Noto Sans"
        fontSize={32}
        fontWeight={600}
        align="center"
        color={JADE}
        animate={[fadeIn(0.45, dur)]}
      >
        Real Hong Kong Cantonese
      </text>
      <text
        x={MARGIN}
        y={1040}
        width={W - MARGIN * 2}
        fontFamily="Syne"
        fontSize={40}
        fontWeight={700}
        align="center"
        color={INK}
        animate={[fadeIn(0.68, dur)]}
      >
        jyuttranslate.com
      </text>
      <text
        x={MARGIN}
        y={1140}
        width={W - MARGIN * 2}
        fontFamily="Noto Sans"
        fontSize={26}
        fontWeight={500}
        align="center"
        color={MUTED}
        animate={[fadeIn(0.95, dur)]}
      >
        Try Conversation mode · Free to start
      </text>
      <group
        name="cta-rule"
        x={W / 2 - 90}
        y={1260}
        width={180}
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
        <rect x={0} y={0} width={180} height={6} fill={JADE} radius={3} />
      </group>
    </group>
  );
}
