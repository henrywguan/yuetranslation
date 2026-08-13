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
 * Iridescent bubble field — soft SDF spheres with fresnel sheen,
 * tinted harbor / jade / ink. u_light switches dark ↔ light bases.
 */
const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_light;

float hash(float n) { return fract(sin(n) * 43758.5453123); }

vec3 palette(float t, float light) {
  vec3 harbor = mix(vec3(0.027, 0.075, 0.122), vec3(0.93, 0.96, 0.97), light);
  vec3 jade   = mix(vec3(0.239, 0.812, 0.714), vec3(0.12, 0.62, 0.54), light);
  vec3 ink    = mix(vec3(0.91, 0.96, 1.0), vec3(0.15, 0.32, 0.48), light);
  vec3 mint   = mix(vec3(0.604, 0.941, 0.871), vec3(0.24, 0.72, 0.64), light);
  vec3 a = mix(harbor, jade, smoothstep(0.0, 0.55, t));
  vec3 b = mix(a, ink, smoothstep(0.35, 0.9, t));
  return mix(b, mint, smoothstep(0.7, 1.0, t) * 0.55);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.x, u_res.y);
  float t = u_time;

  vec3 ro = vec3(0.0, 0.0, 3.2);
  vec3 rd = normalize(vec3(uv, -1.35));

  float minD = 1e5;
  vec3 hitN = vec3(0.0, 0.0, 1.0);
  float hitId = 0.0;

  // Soft cluster of drifting bubbles
  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    float ang = fi * 2.399963 + t * (0.08 + 0.02 * fi);
    float rad = 0.55 + 0.35 * hash(fi + 1.7);
    vec3 c = vec3(
      cos(ang) * (0.35 + 0.55 * hash(fi + 3.1)),
      sin(ang * 0.85 + fi) * (0.25 + 0.4 * hash(fi + 5.9)) + 0.1 * sin(t * 0.4 + fi),
      -0.2 - 0.55 * hash(fi + 8.2) + 0.15 * sin(t * 0.25 + fi * 0.7)
    );
    // gentle orbit
    c.xy += 0.12 * vec2(sin(t * 0.3 + fi), cos(t * 0.22 + fi * 1.3));

    vec3 oc = ro - c;
    float b = dot(oc, rd);
    float h = b * b - dot(oc, oc) + rad * rad;
    if (h >= 0.0) {
      float dist = -b - sqrt(h);
      if (dist > 0.0 && dist < minD) {
        minD = dist;
        vec3 p = ro + rd * dist;
        hitN = normalize(p - c);
        hitId = fi + 1.0;
      }
    }
  }

  vec3 bgDark = vec3(0.027, 0.075, 0.122);
  vec3 bgLight = vec3(0.933, 0.961, 0.973);
  vec3 bg = mix(bgDark, bgLight, u_light);

  // soft atmospheric wash behind bubbles
  float wash = length(uv * vec2(1.1, 0.9));
  vec3 haze = palette(0.35 + 0.25 * sin(t * 0.15 + wash * 2.0), u_light);
  bg = mix(bg, haze, 0.35 * smoothstep(1.2, 0.1, wash));

  vec3 col = bg;

  if (hitId > 0.0) {
    float fres = pow(1.0 - max(dot(hitN, -rd), 0.0), 2.2);
    float band = 0.5 + 0.5 * sin(hitN.x * 4.0 + hitN.y * 3.0 + t * 0.6 + hitId);
    vec3 film = palette(band, u_light);
    vec3 jade = mix(vec3(0.239, 0.812, 0.714), vec3(0.12, 0.62, 0.54), u_light);

    // glass body — see-through with tinted rim
    vec3 glass = mix(bg, film, 0.22 + 0.35 * fres);
    glass += jade * fres * 0.55;
    glass += vec3(1.0) * pow(fres, 6.0) * (0.55 + 0.25 * u_light);

    // specular hotspot
    vec3 ldir = normalize(vec3(-0.4, 0.7, 0.5));
    float spec = pow(max(dot(reflect(rd, hitN), ldir), 0.0), 48.0);
    glass += vec3(0.95, 0.98, 1.0) * spec * (0.65 - 0.15 * u_light);

    // soft contact shadow-ish darkening under sphere
    glass *= 0.92 + 0.08 * hitN.y;

    col = mix(bg, glass, 0.88);
  }

  // floating out-of-focus orbs (2D)
  for (int j = 0; j < 5; j++) {
    float fj = float(j);
    vec2 c2 = vec2(
      sin(t * 0.12 + fj * 1.7) * 0.85,
      cos(t * 0.09 + fj * 2.1) * 0.55
    );
    float r2 = 0.18 + 0.12 * hash(fj + 11.0);
    float d2 = length(uv - c2) / r2;
    float soft = smoothstep(1.0, 0.2, d2);
    vec3 blob = palette(0.4 + 0.3 * hash(fj + 2.2), u_light);
    col = mix(col, blob, soft * (0.12 + 0.08 * u_light));
  }

  float vig = smoothstep(1.35, 0.2, length(uv));
  col *= mix(0.78, 1.0, vig);

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
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

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false })
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
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
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
      gl.uniform1f(timeLoc, 14.0)
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
