/**
 * Shared jade/harbor glass field with screen-space refraction.
 * Used by marketing ShaderBackground and translator FluidBackground.
 */
import { useEffect, useRef } from 'react'
import { useReducedMotion } from '../lib/useReducedMotion'
import { useTheme } from '../lib/theme'

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_light;
uniform float u_calm;
uniform vec2 u_pointer;

vec3 harborCol(float light) {
  return mix(vec3(0.027, 0.075, 0.122), vec3(0.90, 0.945, 0.965), light);
}
vec3 harborMid(float light) {
  return mix(vec3(0.071, 0.196, 0.290), vec3(0.62, 0.78, 0.86), light);
}
vec3 jadeCol(float light) {
  return mix(vec3(0.239, 0.812, 0.714), vec3(0.10, 0.55, 0.48), light);
}
vec3 jadeDeep(float light) {
  return mix(vec3(0.10, 0.48, 0.42), vec3(0.05, 0.36, 0.32), light);
}
vec3 inkCool(float light) {
  return mix(vec3(0.62, 0.78, 0.88), vec3(0.28, 0.44, 0.54), light);
}

vec3 sceneColor(vec2 uv, float t, float light, float calm) {
  vec3 bg = harborCol(light);
  vec2 w1 = uv * vec2(0.92, 1.05);
  float wash1 = exp(-dot(w1 - vec2(-0.38, 0.28), w1 - vec2(-0.38, 0.28)) * 1.7);
  float wash2 = exp(-dot(w1 - vec2(0.58, -0.22), w1 - vec2(0.58, -0.22)) * 1.35);
  float wash3 = exp(-dot(w1 - vec2(0.05, 0.55), w1 - vec2(0.05, 0.55)) * 2.2);
  bg = mix(bg, harborMid(light), wash1 * mix(0.48, 0.55, light));
  bg = mix(bg, jadeDeep(light), wash2 * mix(0.34, 0.42, light) * mix(1.0, 0.72, calm));
  bg = mix(bg, jadeCol(light), wash3 * mix(0.16, 0.28, light) * mix(1.0, 0.65, calm));

  float ribbons = 0.0;
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    float phase = t * (0.18 + fk * 0.03) + fk * 1.7;
    vec2 dir = normalize(vec2(0.65 + 0.2 * sin(fk), 0.35 + 0.15 * cos(fk * 1.3)));
    float stripe = sin(dot(uv, dir) * (7.0 + fk * 2.5) + phase);
    stripe = pow(0.5 + 0.5 * stripe, 3.5);
    ribbons += stripe * (0.55 - fk * 0.08);
  }
  float ribGain = mix(0.12, 0.32, light) * mix(1.0, 0.45, calm);
  bg += mix(jadeCol(light), inkCool(light), 0.35) * ribbons * ribGain;

  for (int j = 0; j < 4; j++) {
    float fj = float(j);
    vec2 c = vec2(
      sin(t * 0.19 + fj * 2.15) * 0.95,
      cos(t * 0.15 + fj * 1.65) * 0.55
    );
    float soft = exp(-dot(uv - c, uv - c) * (1.6 + fj * 0.55));
    vec3 pool = mix(jadeDeep(light), mix(jadeCol(light), inkCool(light), 0.4), 0.55);
    bg = mix(bg, pool, soft * mix(0.28, 0.38, light) * mix(1.0, 0.55, calm));
  }

  float shaft = exp(-pow((uv.x + 0.12 + 0.08 * sin(t * 0.12)) * 2.4, 2.0)) * mix(0.22, 0.34, light);
  bg += mix(inkCool(light), vec3(1.0), light * 0.35) * shaft * mix(1.0, 0.7, calm);
  return bg;
}

vec3 envReflect(vec3 r, float light) {
  vec3 top = mix(inkCool(light), vec3(0.95, 0.98, 1.0), light * 0.5);
  vec3 bot = harborCol(light);
  vec3 side = mix(jadeCol(light), harborMid(light), 0.45);
  vec3 col = mix(bot, top, smoothstep(-0.2, 0.85, r.y));
  col = mix(col, side, pow(abs(r.x), 1.4) * 0.35);
  float key = pow(max(dot(normalize(r), normalize(vec3(-0.35, 0.75, 0.45))), 0.0), 24.0);
  col += vec3(0.92, 0.97, 1.0) * key * 0.55;
  return col;
}

vec4 refractOrb(vec2 uv, vec2 c, float rad, float depth, float light, float t, float ior) {
  vec2 p = (uv - c) / rad;
  float d2 = dot(p, p);
  if (d2 > 1.25) return vec4(0.0);
  float z = sqrt(max(1.0 - d2, 0.0));
  vec3 n = normalize(vec3(p, z));
  vec3 view = vec3(0.0, 0.0, 1.0);
  float eta = 1.0 / ior;
  vec3 refrDir = refract(-view, n, eta);
  if (dot(refrDir, refrDir) < 0.001) refrDir = reflect(-view, n);
  float thickness = 0.38 + 0.85 * z;
  vec2 sampleUV = uv + refrDir.xy * thickness * rad * (1.35 - 0.25 * depth);
  float aberr = 0.014 * rad * (0.55 + 0.55 * z);
  vec3 refracted;
  refracted.r = sceneColor(sampleUV + vec2(aberr, aberr * 0.15), t, light, 0.0).r;
  refracted.g = sceneColor(sampleUV, t, light, 0.0).g;
  refracted.b = sceneColor(sampleUV - vec2(aberr * 0.75, aberr * 0.35), t, light, 0.0).b;
  float path = 1.0 - z;
  refracted = mix(refracted, jadeDeep(light), 0.10 + 0.22 * path);
  refracted = mix(refracted, jadeCol(light), 0.06 * z);
  refracted *= 1.0 + 0.12 * z;
  vec3 reflected = envReflect(reflect(-view, n), light);
  float fres = mix(0.04, 1.0, pow(1.0 - max(dot(n, view), 0.0), 3.2));
  vec3 col = mix(refracted, reflected, fres);
  vec3 l = normalize(vec3(-0.4, 0.75, 0.5));
  float spec = pow(max(dot(reflect(-l, n), view), 0.0), 64.0);
  col += vec3(0.93, 0.98, 1.0) * spec * 0.85;
  float body = smoothstep(1.12, 0.78, sqrt(d2));
  float rimBoost = smoothstep(0.55, 0.95, sqrt(d2));
  float alpha = body * mix(0.78, 0.42, depth);
  alpha = mix(alpha, min(alpha + 0.22, 0.94), rimBoost * fres);
  alpha *= mix(0.96, 0.9, light);
  alpha *= smoothstep(1.2, 0.7, sqrt(d2));
  return vec4(col, alpha);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / min(u_res.x, u_res.y);
  float calm = clamp(u_calm, 0.0, 1.0);
  float t = u_time * mix(0.2, 0.09, calm);
  float light = u_light;
  vec2 ptr = u_pointer * mix(0.055, 0.022, calm);
  vec3 col = sceneColor(uv, t, light, calm);

  for (int j = 0; j < 3; j++) {
    float fj = float(j);
    vec2 c = vec2(sin(t * 0.28 + fj * 1.8) * 1.0, cos(t * 0.22 + fj * 2.0) * 0.55) + ptr * (0.35 + 0.1 * fj);
    float soft = exp(-dot(uv - c, uv - c) * (1.5 + 0.4 * fj));
    col = mix(col, mix(jadeDeep(light), harborMid(light), 0.5), soft * 0.12 * mix(1.0, 0.5, calm));
  }

  float orbScale = mix(1.0, 0.82, calm);
  float orbAlpha = mix(1.0, 0.72, calm);
  vec4 o0 = refractOrb(uv, vec2(0.44 + 0.03 * sin(t * 0.45), 0.06 + 0.025 * cos(t * 0.35)) + ptr, 0.58 * orbScale, 0.08, light, t, 1.42);
  col = mix(col, o0.rgb, o0.a * orbAlpha);
  vec4 o1 = refractOrb(uv, vec2(-0.52 + 0.025 * cos(t * 0.3), 0.30) + ptr * 0.7, 0.32 * orbScale, 0.35, light, t, 1.40);
  col = mix(col, o1.rgb, o1.a * orbAlpha);
  vec4 o2 = refractOrb(uv, vec2(0.12, -0.40 + 0.03 * sin(t * 0.4)) + ptr * 0.5, 0.24 * orbScale, 0.45, light, t, 1.45);
  col = mix(col, o2.rgb, o2.a * orbAlpha * mix(1.0, 0.55, calm));
  if (calm < 0.85) {
    vec4 o3 = refractOrb(uv, vec2(-0.18 + 0.02 * sin(t), 0.52) + ptr * 0.4, 0.16, 0.6, light, t, 1.38);
    col = mix(col, o3.rgb, o3.a);
    vec4 o4 = refractOrb(uv, vec2(0.70, -0.26) + ptr * 0.3, 0.14, 0.7, light, t, 1.48);
    col = mix(col, o4.rgb, o4.a);
  }

  float vig = smoothstep(mix(1.5, 1.15, calm), mix(0.22, 0.42, calm), length(uv * vec2(1.05, 1.0)));
  col *= mix(0.9, 1.0, vig);
  col += jadeCol(light) * (0.015 * (1.0 - light) * mix(1.0, 0.4, calm));
  gl_FragColor = vec4(col, 1.0);
}

`

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, src)
  gl.compileShader(shader)
  const log = gl.getShaderInfoLog(shader)?.trim()
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(
      '[JadeGlassField] compile failed',
      type === gl.VERTEX_SHADER ? 'vertex' : 'fragment',
      log || '(no log)',
    )
    gl.deleteShader(shader)
    return null
  }
  return shader
}

type Props = {
  className?: string
  /** Extra CSS class for the outer wrapper (e.g. fluid-bg vs shader-bg). */
  variant?: 'marketing' | 'app'
}

export function JadeGlassField({ className = '', variant = 'marketing' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()
  const { theme } = useTheme()
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    })
    if (!gl || gl.isContextLost()) return

    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[JadeGlassField] link', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)
    canvas.classList.add('is-live')
    const fallback = canvas.parentElement?.querySelector('.shader-fallback, .fluid-fallback')
    if (fallback instanceof HTMLElement) {
      fallback.style.opacity = '0'
      fallback.style.pointerEvents = 'none'
    }

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const posLoc = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(posLoc)
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

    const resLoc = gl.getUniformLocation(program, 'u_res')
    const timeLoc = gl.getUniformLocation(program, 'u_time')
    const lightLoc = gl.getUniformLocation(program, 'u_light')
    const calmLoc = gl.getUniformLocation(program, 'u_calm')
    const pointerLoc = gl.getUniformLocation(program, 'u_pointer')
    const calm = variant === 'app' ? 1 : 0

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

    const onPointer = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = -((e.clientY / window.innerHeight) * 2 - 1)
      pointer.current.tx = nx
      pointer.current.ty = ny
    }

    const render = (now: number) => {
      if (!running) return
      resize()
      const p = pointer.current
      p.x += (p.tx - p.x) * 0.06
      p.y += (p.ty - p.y) * 0.06
      gl.uniform1f(timeLoc, (now - start) / 1000)
      gl.uniform1f(lightLoc, light)
      gl.uniform1f(calmLoc, calm)
      gl.uniform2f(pointerLoc, p.x, p.y)
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
    gl.uniform1f(calmLoc, calm)
    gl.uniform2f(pointerLoc, 0, 0)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    if (reduced) {
      gl.uniform1f(timeLoc, 20.0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    } else {
      raf = requestAnimationFrame(render)
    }

    return () => {
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(program)
      gl.deleteShader(vert)
      gl.deleteShader(frag)
      gl.deleteBuffer(buffer)
    }
  }, [reduced, theme, variant])

  const wrapClass =
    variant === 'app' ? `fluid-bg jade-glass-field ${className}` : `shader-bg jade-glass-field ${className}`

  return (
    <div className={wrapClass.trim()} aria-hidden="true">
      <div className={variant === 'app' ? 'fluid-fallback' : 'shader-fallback'} />
      <canvas ref={canvasRef} className={variant === 'app' ? 'fluid-canvas' : 'shader-canvas'} />
      <div className={variant === 'app' ? 'fluid-grain' : 'shader-grain'} />
    </div>
  )
}
