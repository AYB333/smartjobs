import { motion } from 'framer-motion';

export default function TextReveal({ text, className }) {
    const words = text.split(" ");

    const container = {
        hidden: { opacity: 0 },
        visible: (i = 1) => ({
            opacity: 1,
            transition: { staggerChildren: 0.12, delayChildren: 0.04 * i },
        }),
    };

    const child = {
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: "spring", damping: 12, stiffness: 100 },
        },
        hidden: {
            opacity: 0,
            y: 100,
            transition: { type: "spring", damping: 12, stiffness: 100 },
        },
    };

    return (
        <motion.div
            className={`flex flex-wrap gap-x-[0.25em] gap-y-2 ${className}`}
            variants={container}
            initial="hidden"
            animate="visible"
        >
            {words.map((word, idx) => (
                <motion.span
                    variants={child}
                    key={idx}
                    className="inline-block"
                >
                    {word}
                </motion.span>
            ))}
        </motion.div>
    );
}
