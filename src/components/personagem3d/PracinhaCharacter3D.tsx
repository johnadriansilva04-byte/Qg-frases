/**
 * PRACINHA 3D — Personagem guia da Cidadela dos Clássicos.
 *
 * Soldado da FEB (Força Expedicionária Brasileira) renderizado
 * com CSS puro: capacete, farda, botas, e emblema "Cobra Fumando".
 * Poses: idle (braços abaixados), apontando, conversando.
 *
 * Zero dependências externas — CSS shapes + animações.
 */
import React from "react";

type Pose = "idle" | "pointing" | "talking";

interface Props {
  pose?: Pose;
  size?: number;
  className?: string;
}

/* ─── Cores FEB ─── */
const FEB = {
  uniform: "#2d4a22",
  skin: "#c98b62",
  helmet: "#3a3a2a",
  boots: "#1a1208",
  emblem: "#c9a84c",
  belt: "#2a1a0a",
  pants: "#1e3318",
};

export function PracinhaCharacter3D({ pose = "idle", size = 120, className }: Props) {
  const scale = size / 120;
  const armAngleL = pose === "talking" ? "25deg" : pose === "pointing" ? "10deg" : "8deg";
  const armAngleR = pose === "talking" ? "-25deg" : pose === "pointing" ? "-130deg" : "-8deg";
  const animClass = pose === "talking" ? "pracinha-talking" : pose === "pointing" ? "pracinha-pointing" : "pracinha-idle";

  return (
    <div
      className={`relative select-none ${className ?? ""}`}
      style={{ width: size, height: size * 1.5, transform: `scale(${scale})`, transformOrigin: "bottom center" }}
    >
      <style>{`
        .pracinha-idle { animation: pracinha-breathe 3s ease-in-out infinite; }
        .pracinha-talking { animation: pracinha-talk 0.6s ease-in-out infinite; }
        .pracinha-pointing { animation: pracinha-point 2s ease-in-out infinite; }
        @keyframes pracinha-breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-1px); } }
        @keyframes pracinha-talk { 0%,100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-1px) rotate(1deg); } 75% { transform: translateY(-1px) rotate(-1deg); } }
        @keyframes pracinha-point { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(2deg); } }
      `}</style>

      <div className={animClass} style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Capacete */}
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 36, height: 22, borderRadius: "50% 50% 30% 30%", background: FEB.helmet,
          border: `2px solid ${FEB.helmet}`, zIndex: 3,
        }}>
          {/* Brim */}
          <div style={{
            position: "absolute", bottom: -3, left: -4, width: 44, height: 6,
            borderRadius: "0 0 50% 50%", background: FEB.helmet,
          }} />
          {/* Emblema Cobra Fumando */}
          <div style={{
            position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
            width: 10, height: 10, borderRadius: "50%", background: FEB.emblem,
            boxShadow: `0 0 4px ${FEB.emblem}88`, border: "1px solid #a88a3c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 5, color: "#1a1208", fontWeight: 900,
          }}>🐍</div>
        </div>

        {/* Cabeça */}
        <div style={{
          position: "absolute", top: 18, left: "50%", transform: "translateX(-50%)",
          width: 20, height: 20, borderRadius: "50%", background: FEB.skin, zIndex: 2,
        }}>
          {/* Olhos */}
          <div style={{ position: "absolute", top: 7, left: 4, width: 3, height: 3, borderRadius: "50%", background: "#1a1a1a" }} />
          <div style={{ position: "absolute", top: 7, right: 4, width: 3, height: 3, borderRadius: "50%", background: "#1a1a1a" }} />
          {/* Sorriso */}
          <div style={{ position: "absolute", bottom: 5, left: "50%", transform: "translateX(-50%)", width: 6, height: 2, borderRadius: "0 0 50% 50%", borderBottom: `1.5px solid #8b6040` }} />
        </div>

        {/* Torso (farda) */}
        <div style={{
          position: "absolute", top: 36, left: "50%", transform: "translateX(-50%)",
          width: 40, height: 44, borderRadius: "6px 6px 2px 2px", background: FEB.uniform,
          border: `1px solid #1e3318`, zIndex: 1,
        }}>
          {/* Colarinho */}
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: 16, height: 6, borderRadius: "0 0 4px 4px", background: FEB.uniform,
            borderBottom: `1px solid #1e3318`,
          }} />
          {/* Cinto */}
          <div style={{
            position: "absolute", bottom: 2, left: 0, width: "100%", height: 5,
            background: FEB.belt, borderRadius: 1,
          }}>
            <div style={{
              position: "absolute", top: 1, left: "50%", transform: "translateX(-50%)",
              width: 6, height: 3, borderRadius: 1, background: FEB.emblem,
            }} />
          </div>
          {/* Emblema FEB no braço */}
          <div style={{
            position: "absolute", top: 12, right: -2, width: 8, height: 8, borderRadius: "50%",
            background: FEB.emblem, border: "1px solid #a88a3c",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 4, boxShadow: `0 0 3px ${FEB.emblem}66`,
          }}>FEB</div>
        </div>

        {/* Braço esquerdo */}
        <div style={{
          position: "absolute", top: 38, left: 12,
          width: 12, height: 36, borderRadius: "6px",
          background: FEB.uniform, transformOrigin: "top center",
          transform: `rotate(${armAngleL})`,
          transition: "transform 0.4s ease", zIndex: 0,
        }}>
          <div style={{
            position: "absolute", bottom: -2, left: 1, width: 10, height: 10,
            borderRadius: "50%", background: FEB.skin,
          }} />
        </div>

        {/* Braço direito */}
        <div style={{
          position: "absolute", top: 38, right: 12,
          width: 12, height: 36, borderRadius: "6px",
          background: FEB.uniform, transformOrigin: "top center",
          transform: `rotate(${armAngleR})`,
          transition: "transform 0.4s ease", zIndex: 0,
        }}>
          <div style={{
            position: "absolute", bottom: -2, right: 1, width: 10, height: 10,
            borderRadius: "50%", background: FEB.skin,
          }} />
        </div>

        {/* Perna esquerda */}
        <div style={{
          position: "absolute", top: 78, left: 26,
          width: 14, height: 32, borderRadius: "4px",
          background: FEB.pants, zIndex: 0,
        }}>
          <div style={{
            position: "absolute", bottom: -4, left: 0, width: 16, height: 10,
            borderRadius: "2px 2px 4px 4px", background: FEB.boots,
          }} />
        </div>

        {/* Perna direita */}
        <div style={{
          position: "absolute", top: 78, right: 26,
          width: 14, height: 32, borderRadius: "4px",
          background: FEB.pants, zIndex: 0,
        }}>
          <div style={{
            position: "absolute", bottom: -4, right: 0, width: 16, height: 10,
            borderRadius: "2px 2px 4px 4px", background: FEB.boots,
          }} />
        </div>

        {/* Sombra */}
        <div style={{
          position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
          width: 50, height: 6, borderRadius: "50%", background: "rgba(0,0,0,0.2)",
          filter: "blur(3px)",
        }} />
      </div>
    </div>
  );
}
