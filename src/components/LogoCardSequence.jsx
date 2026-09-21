import React, { forwardRef, useEffect, useId, useRef } from "react";
import { gsap } from "gsap";

const LOGO_PATH =
  "M614.772 389.564C594.913 377.699 588.325 366.317 561.276 301.066L472.333 61.7146C459.544 27.2785 427.777 0 381.122 0H230.419C166.101 0 100.468 46.4459 100.468 123.176C100.468 199.906 159.574 233.944 201.801 233.944C214.529 233.944 227.716 230.697 238.877 224.493C255.007 215.573 266.807 200.461 266.807 180.219C266.807 159.978 252.594 148.801 238.877 140.569C226.039 132.832 213.6 127.219 213.6 117.08C213.6 109.452 216.942 103.779 224.712 103.779H274.082L262.62 135.499C273.394 148.258 284.603 168.499 279.728 194.547C273.189 229.852 238.08 242.912 221.66 247.148L210.198 278.965C210.198 278.965 253.318 311.76 240.481 359.147C226.172 411.894 176.115 413.27 172.182 422.081C172.133 422.226 172.085 422.37 172.037 422.527C167.911 437.941 160.286 445.038 151.333 442.672C142.635 440.355 139.679 433.065 142.188 423.517C145.977 409.335 161.564 404.857 178.371 398.592C197.059 391.604 217.22 382.394 224.447 355.248C231.083 330.227 222.239 308.465 206.458 293.148C196.48 283.443 183.692 276.406 170.324 272.858C120.073 259.411 31.8664 281.476 5.75785 379.485C-19.9525 476.107 44.3536 548.117 120.954 568.552C188.662 586.621 277.412 561.02 300.963 472.57L331.402 367.379H435.547C435.547 367.379 451.774 408.26 462.536 425.979C507.768 500.537 622.481 467.79 614.615 389.636L614.76 389.588L614.772 389.564ZM360.322 250.624L376.405 202.066H384.862L399.907 250.624H360.322Z";

const GHOST_COUNT = 4;
const GHOSTS = Array.from({ length: GHOST_COUNT }, (_, index) => index);
const GHOST_GAP = 12;
const WARP_SLICES = 96;

const LogoSvg = forwardRef(function LogoSvg({ className, pathClassName }, ref) {
  const reactId = useId().replace(/:/g, "");
  const clipId = `${pathClassName}-${reactId}-clip`;
  return (
    <svg ref={ref} className={className} viewBox="0 0 615 574" aria-hidden="true">
      <defs>
        {Array.from({ length: WARP_SLICES }, (_, index) => {
          const y = (574 / WARP_SLICES) * index;
          const height = 574 / WARP_SLICES + 2.5;
          return (
            <clipPath key={index} id={`${clipId}-${index}`}>
              <rect x="-160" y={y - 1.5} width="935" height={height + 3} />
            </clipPath>
          );
        })}
      </defs>
      {Array.from({ length: WARP_SLICES }, (_, index) => (
        <g key={index} className="logo-sequence__slice" clipPath={`url(#${clipId}-${index})`} data-slice-index={index}>
          <path className={pathClassName} d={LOGO_PATH} />
        </g>
      ))}
    </svg>
  );
});

export default function LogoCardSequence() {
  const sectionRef = useRef(null);
  const ghostRefs = useRef([]);

  useEffect(() => {
    const context = gsap.context(() => {
      const cycle = { phase: 0 };
      const syncGhosts = () => {
        ghostRefs.current.forEach((ghost, index) => {
          if (!ghost) return;
          const slot = (index + cycle.phase) % GHOST_COUNT;
          const fade = 1 - slot / GHOST_COUNT;
          gsap.set(ghost, {
            x: 0,
            y: -slot * GHOST_GAP,
            opacity: 0.06 + Math.pow(fade, 2.4) * 0.84,
          });
        });
      };

      syncGhosts();
      gsap.to(cycle, {
        phase: GHOST_COUNT,
        duration: 4.2,
        ease: "none",
        repeat: -1,
        onUpdate: syncGhosts,
      });

      const slices = Array.from(sectionRef.current.querySelectorAll(".logo-sequence__slice"));
      const warpState = { phase: 0 };
      const syncWarp = () => {
        slices.forEach((slice) => {
          const sliceIndex = parseInt(slice.dataset.sliceIndex || "0", 10);
          const yNorm = sliceIndex / Math.max(1, WARP_SLICES - 1);
          const bendA = Math.sin(yNorm * Math.PI * 2 * 1.05 + warpState.phase);
          const bendB = Math.cos(yNorm * Math.PI * 1.05 * 0.65 - warpState.phase * 0.7);
          gsap.set(slice, { x: (bendA * 0.72 + bendB * 0.28) * 14 });
        });
      };

      syncWarp();
      gsap.to(warpState, {
        phase: Math.PI * 2000,
        duration: 2800,
        ease: "none",
        onUpdate: syncWarp,
      });
    }, sectionRef);

    return () => context.revert();
  }, []);

  return (
    <footer ref={sectionRef} className="logo-sequence" aria-label="Logo sequence">
      <div className="logo-sequence__mark" aria-hidden="true">
        <div className="logo-sequence__ghosts">
          {GHOSTS.map((ghost) => (
            <LogoSvg
              key={ghost}
              className="logo-sequence__ghost"
              pathClassName="logo-sequence__ghost-path"
              ref={(node) => {
                ghostRefs.current[ghost] = node;
              }}
            />
          ))}
        </div>
        <LogoSvg className="logo-sequence__solid" pathClassName="logo-sequence__solid-path" />
      </div>
      <div className="logo-sequence__caption">
        <span className="logo-sequence__caption-title">Clone Experiment</span>
        <span className="logo-sequence__caption-byline">
          <span>BY</span>
          <span className="logo-sequence__caption-line" aria-hidden="true" />
          <span>ROBERT APERIOS</span>
        </span>
      </div>
    </footer>
  );
}
