// JyutTranslate Reel v2 — dinner / 口語 vs 書面 (~21s, 9:16)
// Brand: Harbor / Jade / Ink · Syne + Noto Sans HK
// Motion: kinetic type → strike → 2.5D bullet-time orbit → punch zoom → CTA

const HARBOR = "#07131f";
const HARBOR_MID = "#0a1c2c";
const JADE = "#3dcfb6";
const JADE_BRIGHT = "#7ef0dc";
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
    dir: "jyut-dinner-reel-v2",
    size: `${W}x${H}`,
    fps: FPS,
    background: HARBOR,
  });

  const uiStill = await p.add("media/ui-reel-still.png");
  const uiResult = await p.add("media/ui-result.png");
  const logo = await p.add("media/logo-mark.png");

  const BEATS = [
    { id: "hook", dur: 3.2, build: beatHook },
    { id: "strike", dur: 3.8, build: beatStrike },
    { id: "orbit", dur: 9.4, build: (d) => beatOrbit(d, uiStill, uiResult) },
    { id: "cta", dur: 4.6, build: (d) => beatCta(d, logo) },
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

  await p.frame(0.9, "renders/proof-hook.png");
  await p.frame(5.2, "renders/proof-strike.png");
  await p.frame(8.4, "renders/proof-orbit-open.png");
  await p.frame(11.8, "renders/proof-orbit-peak.png");
  await p.frame(14.6, "renders/proof-zoom.png");
  await p.frame(18.8, "renders/proof-cta.png");

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
    [start + 0.32, 1, "house"],
    [dur - holdEnd, 1],
  ]);
}

function beatHook(dur) {
  return (
    <group name="hook">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />
      {/* Soft orbital glow */}
      <group
        name="glow"
        x={W / 2 - 420}
        y={H / 2 - 520}
        width={840}
        height={840}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.85],
            [1.6, 1.08, "ease-in-out"],
            [dur - 0.08, 0.95, "ease-in-out"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.35, 0.55, "house"],
            [dur - 0.08, 0.35],
          ]),
          chain("rotation", dur, [
            [0, -8],
            [dur - 0.08, 12, "linear"],
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
              { offset: 0, color: "rgba(61,207,182,0.28)" },
              { offset: 0.55, color: "rgba(18,50,74,0.18)" },
              { offset: 1, color: "rgba(7,19,31,0)" },
            ],
          }}
        />
      </group>

      <group
        name="jade-bar"
        x={MARGIN}
        y={260}
        width={6}
        height={440}
        origin="center"
        animate={[
          chain("scaleY", dur, [
            [0, 0],
            [0.12, 0],
            [0.65, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={6} height={440} fill={JADE} radius={3} />
      </group>

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
          duration: 0.42,
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
          from: { y: 60, opacity: 0, scale: 0.9 },
          overlap: 0.4,
          duration: 0.48,
          easing: "house",
        }}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [1.05, 0],
            [1.4, 1],
            [dur - 0.45, 1],
            [dur - 0.08, 0],
          ]),
          chain("scale", dur, [
            [0, 0.92],
            [1.05, 0.92],
            [1.55, 1.0, "house"],
            [dur - 0.08, 1.04],
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
        animate={[fadeIn(0.18, dur)]}
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
        animate={[fadeIn(0.65, dur)]}
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
        animate={[fadeIn(0.95, dur)]}
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
            [1.35, 0],
            [1.9, 1, "house"],
            [dur - 0.08, 1],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [1.3, 0],
            [1.45, 1],
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
            [2.15, 0],
            [2.55, 1, "house"],
            [dur - 0.35, 1],
            [dur - 0.08, 0.3],
          ]),
        ]}
      >
        That is not how families talk.
      </text>
    </group>
  );
}

function beatOrbit(dur, uiStill, uiResult) {
  const cardW = W - MARGIN * 2;
  const cardH = Math.round(cardW * (550 / 900));
  const cardY = 520;
  return (
    <group name="orbit">
      <rect x={0} y={0} width={W} height={H} fill={HARBOR} />

      <group
        name="orbit-glow"
        x={W / 2 - 500}
        y={H / 2 - 600}
        width={1000}
        height={1000}
        origin="center"
        animate={[
          chain("rotation", dur, [
            [0, -22],
            [dur - 0.08, 34, "linear"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.4, 0.72, "house"],
            [dur - 0.08, 0.4],
          ]),
          chain("scale", dur, [
            [0, 0.92],
            [4.5, 1.08, "ease-in-out"],
            [dur - 0.08, 1.15, "ease-in-out"],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={1000}
          height={1000}
          radius={500}
          fill={{
            kind: "radial",
            angle: 0,
            stops: [
              { offset: 0, color: "rgba(126,240,220,0.24)" },
              { offset: 0.45, color: "rgba(61,207,182,0.12)" },
              { offset: 1, color: "rgba(7,19,31,0)" },
            ],
          }}
        />
      </group>

      <group
        name="phone"
        x={0}
        y={0}
        width={W}
        height={H}
        origin="center"
        motionBlur={{ samples: 6, shutter: 0.45 }}
        animate={[
          chain("offsetX", dur, [
            [0, 0],
            [1.2, -36, "ease-in-out"],
            [3.4, 42, "ease-in-out"],
            [5.6, -28, "ease-in-out"],
            [7.2, 12, "ease-in-out"],
            [dur - 0.08, 0, "house"],
          ]),
          chain("offsetY", dur, [
            [0, 0],
            [1.2, 18, "ease-in-out"],
            [3.4, -24, "ease-in-out"],
            [5.6, 14, "ease-in-out"],
            [7.2, -8, "ease-in-out"],
            [dur - 0.08, 0, "house"],
          ]),
          chain("scale", dur, [
            [0, 1.02],
            [0.55, 1.06, "house"],
            [6.0, 1.14, "ease-in-out"],
            [dur - 0.08, 1.32, "house"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.35, 1, "house"],
            [dur - 0.08, 1],
          ]),
          chain("rotation", dur, [
            [0, -1.6],
            [2.8, 1.8, "ease-in-out"],
            [5.4, -1.0, "ease-in-out"],
            [dur - 0.08, 0.3, "ease-in-out"],
          ]),
        ]}
      >
        <media file={uiStill} x={0} y={0} width={W} height={H} fit="cover" />
      </group>

      <rect
        x={0}
        y={0}
        width={W}
        height={460}
        fill={{
          kind: "linear",
          angle: 90,
          stops: [
            { offset: 0, color: "rgba(7,19,31,0.94)" },
            { offset: 1, color: "rgba(7,19,31,0)" },
          ],
        }}
      />

      <text
        x={MARGIN}
        y={170}
        width={cardW}
        fontFamily="Noto Sans HK"
        fontSize={28}
        fontWeight={700}
        color={JADE}
        animate={[fadeIn(0.05, dur)]}
      >
        REAL 口語粵語
      </text>
      <text
        x={MARGIN}
        y={230}
        width={cardW}
        fontFamily="Syne"
        fontSize={60}
        fontWeight={700}
        letterSpacing={-1}
        color={INK}
        motion={{
          by: "word",
          from: { y: 40, opacity: 0 },
          overlap: 0.5,
          duration: 0.38,
          easing: "house",
        }}
      >
        {"What they actually say"}
      </text>

      <group
        name="result-card"
        x={MARGIN}
        y={cardY}
        width={cardW}
        height={cardH + 28}
        origin="center"
        motionBlur={{ samples: 8, shutter: 0.5 }}
        animate={[
          chain("scale", dur, [
            [0, 0.88],
            [5.5, 0.88],
            [6.05, 1.02, "house"],
            [7.3, 1.1, "ease-in-out"],
            [dur - 0.08, 1.22, "house"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [5.4, 0],
            [5.85, 1, "house"],
            [dur - 0.4, 1],
            [dur - 0.08, 0],
          ]),
          chain("rotation", dur, [
            [0, 3.2],
            [5.5, 3.2],
            [6.2, 0, "house"],
            [dur - 0.08, -0.8],
          ]),
          chain("offsetY", dur, [
            [0, 40],
            [5.5, 40],
            [6.2, 0, "house"],
            [dur - 0.08, -12],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={cardW}
          height={cardH + 28}
          fill={HARBOR_MID}
          radius={28}
          shadow={{ x: 0, y: 24, blur: 48, color: "rgba(0,0,0,0.45)" }}
        />
        <media
          file={uiResult}
          x={14}
          y={14}
          width={cardW - 28}
          height={cardH}
          fit="cover"
          radius={20}
        />
      </group>

      <text
        x={MARGIN}
        y={H - 240}
        width={cardW}
        fontFamily="Noto Sans HK"
        fontSize={36}
        fontWeight={700}
        color={INK}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [0.7, 0],
            [1.15, 1, "house"],
            [dur - 0.55, 1],
            [dur - 0.08, 0],
          ]),
        ]}
      >
        你返唔返嚟食飯㗎？
      </text>
      <text
        x={MARGIN}
        y={H - 175}
        width={cardW}
        fontFamily="Noto Sans"
        fontSize={22}
        fontWeight={600}
        color={JADE}
        animate={[
          chain("opacity", dur, [
            [0, 0],
            [1.0, 0],
            [1.4, 1, "house"],
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
      {/* Ambient orbit ring */}
      <group
        name="cta-ring"
        x={W / 2 - 200}
        y={520}
        width={400}
        height={400}
        origin="center"
        animate={[
          chain("rotation", dur, [
            [0, 0],
            [dur - 0.08, 40, "linear"],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.4, 0.35, "house"],
            [dur - 0.08, 0.2],
          ]),
        ]}
      >
        <rect
          x={0}
          y={0}
          width={400}
          height={400}
          radius={200}
          fill="rgba(0,0,0,0)"
          strokeWidth={2}
          strokeColor="rgba(61,207,182,0.45)"
        />
      </group>

      <group
        name="logo-wrap"
        x={W / 2 - 80}
        y={560}
        width={160}
        height={160}
        origin="center"
        animate={[
          chain("scale", dur, [
            [0, 0.78],
            [0.55, 1.06, "house"],
            [0.9, 1.0, "ease-out"],
            [dur - 0.08, 1],
          ]),
          chain("opacity", dur, [
            [0, 0],
            [0.2, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <media file={logo} x={0} y={0} width={160} height={160} fit="contain" />
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
        animate={[fadeIn(0.48, dur)]}
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
        animate={[fadeIn(0.72, dur)]}
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
        animate={[fadeIn(1.0, dur)]}
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
            [1.1, 0],
            [1.55, 1, "house"],
            [dur - 0.08, 1],
          ]),
        ]}
      >
        <rect x={0} y={0} width={180} height={6} fill={JADE} radius={3} />
      </group>
    </group>
  );
}
