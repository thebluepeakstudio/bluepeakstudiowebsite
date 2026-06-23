import "../../Style.css";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame
} from "framer-motion";

const wrap = (min, max, v) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

function ParallaxText({ children, baseVelocity = 80 }) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();

  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });

  const velocityFactor = useTransform(smoothVelocity, [0, 2000], [0, 5], {
    clamp: false
  });

  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`);

  const directionFactor = useRef(1);

  useAnimationFrame((t, delta) => {
    let moveBy = directionFactor.current * baseVelocity * (delta / 2000);

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div className="parallax font-[dual] tracking-[1px]">
      <motion.div className="scroller" style={{ x }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i}>{children} </span>
        ))}
      </motion.div>
    </div>
  );
}

export default function SectionHeader({title}) {
  return (
    <section>
      <ParallaxText baseVelocity={-5}>{title}</ParallaxText>
      {/* <ParallaxText baseVelocity={5}>BluePeak Studio</ParallaxText> */}
    </section>
  );
}