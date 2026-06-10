import { motion, useInView, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect } from 'react';

export default function AnimatedCounter({ value, suffix = "" }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });
    const spring = useSpring(0, { mass: 1, stiffness: 50, damping: 20 });
    const display = useTransform(spring, (current) => Math.floor(current) + suffix);

    useEffect(() => {
        if (inView) {
            spring.set(value);
        }
    }, [inView, spring, value]);

    return <motion.span ref={ref}>{display}</motion.span>;
}