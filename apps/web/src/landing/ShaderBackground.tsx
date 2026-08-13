import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/**
 * Elegant jade / harbor glass orbs — soft depth, crescent highlights,
 * restrained palette (no rainbow film). u_light = light theme.
 */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_light;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

vec3 harborCol(float light) {
  return mix(vec3(0.027, 0.075, 0.122), vec3(0.933, 0.961, 0.973), light);
}
vec3 harborMid(float light) {
  return mix(vec3(0.071, 0.196, 0.290), vec3(0.72, 0.84, 0.90), light);
}
vec3 jadeCol(float light) {
  return mix(vec3(0.239, 0.812, 0.714), vec3(0.122, 0.624, 0.541), light);
}
vec3 jadeDeep(float light) {
  return mix(vec3(0.122, 0.561, 0.478), vec3(0.06, 0.42, 0.36), light);
}
vec3 inkCool(float light) {
  return mix(vec3(0.55, 0.72, 0.82), vec3(0.25, 0.42, 0.52), light);
}

// Soft 2D glass disc with depth / elegance
vec4 glassOrb(vec2 uv, vec2 c, float r, float depth, float light, float t, float seed) {
  vec2 p = (uv - c) / r;
  float d = length(p);
  if (d > 1.35) return vec4(0.0);

  // soft limb (not a hard plastic edge)
  float body = smoothstep(1.12, 0.62, d);
  float rim = smoothstep(0.98, 0.72, d) * smoothstep(0.45, 0.92, d);
  float core = smoothstep(0.75, 0.0, d);

  // crescent specular — elegant, small, cool
  vec2 hl = normalize(vec2(-0.45, 0.72));
  float crescent = pow(max(dot(normalize(p + 0.001), hl), 0.0), 18.0);
  crescent *= smoothstep(0.95, 0.15, d);
  float spark = pow(max(1.0 - length(p - hl * 0.42), 0.0), 40.0);

  // slow inner caustic drift (subtle, jade-only)
  float caustic = 0.5 + 0.5 * sin(p.x * 5.0 + p.y * 4.0 + t * 0.35 + seed);
  caustic *= smoothstep(0.85, 0.1, d) * 0.18;

  vec3 jade = jadeCol(light);
  vec3 deep = jadeDeep(light);
  vec3 cool = inkCool(light);
  vec3 mid = harborMid(light);

  // volume: deep jade center → cooler harbor rim (stone / seawater, not rainbow)
  vec3 col = mix(deep, jade, core * 0.85 + caustic);
  col = mix(col, mix(cool, mid, 0.4), rim * 0.75);
  col += vec3(0.92, 0.97, 1.0) * (crescent * 0.55 + spark * 0.9);
  col += jade * (0.08 + 0.12 * (1.0 - light)) * body;

  // further orbs are softer / dimmer
  float alpha = body * mix(0.55, 0.22, clamp(depth, 0.0, 1.0));
  alpha *= mix(0.92, 0.7, light);
  // feather outer haze
  alpha *= smoothstep(1.3, 0.55, d);

  return vec4(col, alpha);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.x, u_res.y);
  float t = u_time * 0.22;
  float light = u_light;

  vec3 bg = harborCol(light);
  // quiet atmosphere — two large soft washes, not speckles
  vec2 w1 = uv * vec2(0.9, 1.05) + vec2(0.15 * sin(t * 0.3), -0.08);
  float wash1 = exp(-dot(w1 - vec2(-0.35, 0.25), w1 - vec2(-0.35, 0.25)) * 1.8);
  float wash2 = exp(-dot(w1 - vec2(0.55, -0.2), w1 - vec2(0.55, -0.2)) * 1.4);
  bg = mix(bg, harborMid(light), wash1 * 0.35);
  bg = mix(bg, jadeDeep(light), wash2 * 0.22);

  vec3 col = bg;

  // Far soft orbs (atmosphere)
  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    vec2 c = vec2(
      sin(t * 0.31 + fj * 1.9) * 0.95,
      cos(t * 0.24 + fj * 2.3) * 0.55 + 0.05
    );
    float r = 0.42 + 0.22 * hash(fj + 3.0);
    float d = length(uv - c) / r;
    float soft = exp(-d * d * 1.6);
    vec3 haze = mix(jadeDeep(light), harborMid(light), hash(fj + 1.1));
    col = mix(col, haze, soft * mix(0.14, 0.1, light));
  }

  // Primary glass orbs — fewer, larger, layered back → front
  // depth 1 = far, 0 = near
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float ang = fi * 1.2566 + t * (0.12 + 0.03 * fi);
    float rad = mix(0.55, 0.28, fi / 4.0) + 0.06 * hash(fi + 2.2);
    float depth = fi / 4.0;
    vec2 c = vec2(
      cos(ang) * (0.15 + 0.55 * depth) + 0.08 * sin(t * 0.4 + fi),
      sin(ang * 0.9) * (0.12 + 0.35 * depth) + 0.06 * cos(t * 0.35 + fi * 0.7)
    );
    // bias composition: one hero orb right-of-center
    if (i == 0) {
      c = vec2(0.42 + 0.04 * sin(t * 0.5), 0.08 + 0.03 * cos(t * 0.4));
      rad = 0.62;
      depth = 0.15;
    } else if (i == 1) {
      c = vec2(-0.55 + 0.03 * cos(t * 0.35), 0.32);
      rad = 0.34;
      depth = 0.45;
    } else if (i == 2) {
      c = vec2(0.15, -0.42 + 0.03 * sin(t * 0.45));
      rad = 0.26;
      depth = 0.55;
    } else if (i == 3) {
      c = vec2(-0.2 + 0.02 * sin(t), 0.55);
      rad = 0.18;
      depth = 0.7;
    } else {
      c = vec2(0.72, -0.28);
      rad = 0.16;
      depth = 0.8;
    }

    vec4 orb = glassOrb(uv, c, rad, depth, light, t * 4.0, fi * 7.1);
    col = mix(col, orb.rgb, orb.a);
  }

  // gentle vignette — salon lighting, not heavy
  float vig = smoothstep(1.45, 0.25, length(uv * vec2(1.05, 1.0)));
  col *= mix(0.88, 1.0, vig);

  // lift midtones slightly in dark theme for jade richness
  col += jadeCol(light) * (0.02 * (1.0 - light));

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false })
    if (!gl) return

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const resLoc = gl.getUniformLocation(program, 'u_res')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const lightLoc = gl.getUniformLocation(program, 'u_light')

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75)
      const w = Math.floor(canvas.clientWidth * dpr)
      const h = Math.floor(canvas.clientHeight * dpr)
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(resLoc, canvas.width, canvas.height)
    }

    let raf = 0
    let running = true
    const start = performance.now()
    const light = theme === 'light' ? 1 : 0

    const render = (now: number) => {
      if (!running) return
      resize()
      gl.uniform1f(timeLoc, (now - start) / 1000)
      gl.uniform1f(lightLoc, light)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduced) raf = requestAnimationFrame(render)
    }

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(raf)
      } else if (!reduced) {
        running = true
        raf = requestAnimationFrame(render)
      }
    }

    resize()
    gl.uniform1f(lightLoc, light)
    if (reduced) {
      gl.uniform1f(timeLoc, 18.0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    } else {
      raf = requestAnimationFrame(render)
    }

    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [reduced, theme])

  return (
    <div className="shader-bg" aria-hidden="true">
      <div className="shader-fallback" />
      <canvas ref={canvasRef} className="shader-canvas" />
      <div className="shader-grain" />
    </div>
  )
}
